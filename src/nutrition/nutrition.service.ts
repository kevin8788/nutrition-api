import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  AnthropicService,
  NutritionAnalysis,
} from '../anthropic/anthropic.service';
import configuration from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { NutritionResponse } from './interfaces/nutrition-response.interface';

const VALID_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

interface ClientQueueState {
  pendingCount: number;
  tail: Promise<void>;
  requests: Map<string, Promise<NutritionResponse>>;
}

@Injectable()
export class NutritionService {
  private readonly config = configuration();
  private readonly clientQueues = new Map<string, ClientQueueState>();

  constructor(
    private readonly anthropicService: AnthropicService,
    private readonly prisma: PrismaService,
  ) {}

  async analyzeImage(
    dto: AnalyzeImageDto,
    clientKey: string,
    userId?: string,
  ): Promise<NutritionResponse> {
    const fingerprint = this.createFingerprint(dto);
    const queue = this.getClientQueue(clientKey);
    const existingRequest = queue.requests.get(fingerprint);

    if (existingRequest) {
      return existingRequest;
    }

    if (queue.pendingCount >= this.config.nutrition.maxPendingRequestsPerClient) {
      throw new HttpException(
        'Too many pending nutrition requests for this client',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    queue.pendingCount += 1;

    const task = queue.tail
      .then(() => this.performAnalysis(dto, userId))
      .finally(() => {
        queue.pendingCount -= 1;
        queue.requests.delete(fingerprint);
        if (queue.pendingCount === 0 && queue.requests.size === 0) {
          this.clientQueues.delete(clientKey);
        }
      });

    queue.requests.set(fingerprint, task);
    queue.tail = task.then(() => undefined, () => undefined);

    return task;
  }

  private async performAnalysis(dto: AnalyzeImageDto, userId?: string): Promise<NutritionResponse> {
    const mimeType = this.resolveMimeType(dto);

    if (!VALID_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Invalid image type');
    }

    const result: NutritionAnalysis = await this.anthropicService.analyzeImage(
      dto.imageBase64,
      mimeType,
      dto.description?.trim() || undefined,
      this.resolveLanguage(dto),
    );

    const response: NutritionResponse = {
      isValidFood: result.isValidFood,
      foodName: result.foodName,
      servingSize: result.servingSize,
      nutrients: result.nutrients,
      description: result.description,
    };

    if (userId && result.isValidFood) {
      await this.saveLog(userId, response);
    }

    return response;
  }

  private async saveLog(userId: string, result: NutritionResponse): Promise<void> {
    await this.prisma.nutrition_log.create({
      data: {
        user_id: BigInt(userId),
        food_name: result.foodName,
        serving_size: result.servingSize,
        nutrients: result.nutrients ? (result.nutrients as object) : undefined,
        description: result.description,
      },
    });
  }

  private getClientQueue(clientKey: string): ClientQueueState {
    const existing = this.clientQueues.get(clientKey);
    if (existing) return existing;

    const queue: ClientQueueState = {
      pendingCount: 0,
      tail: Promise.resolve(),
      requests: new Map(),
    };
    this.clientQueues.set(clientKey, queue);
    return queue;
  }

  private createFingerprint(dto: AnalyzeImageDto): string {
    const mimeType = this.resolveMimeType(dto);
    const payload = JSON.stringify({
      imageBase64: dto.imageBase64.replace(/^data:[^;]+;base64,/, ''),
      mimeType,
      description: dto.description?.trim() || '',
      language: this.resolveLanguage(dto),
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  private resolveMimeType(dto: AnalyzeImageDto): string {
    if (dto.mimeType) return dto.mimeType;
    const match = dto.imageBase64.match(/^data:([^;]+);base64,/);
    return match?.[1] ?? 'image/png';
  }

  private resolveLanguage(dto: AnalyzeImageDto): string {
    return dto.language?.trim() || this.config.nutrition.defaultLanguage;
  }
}
