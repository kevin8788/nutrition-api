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
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { NutritionResponse } from './interfaces/nutrition-response.interface';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
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

  constructor(private readonly anthropicService: AnthropicService) {}

  async analyzeImage(
    dto: AnalyzeImageDto,
    clientKey: string,
  ): Promise<NutritionResponse> {
    const fingerprint = this.createFingerprint(dto);
    const queue = this.getClientQueue(clientKey);
    const existingRequest = queue.requests.get(fingerprint);

    if (existingRequest) {
      return existingRequest;
    }

    if (
      queue.pendingCount >= this.config.nutrition.maxPendingRequestsPerClient
    ) {
      throw new HttpException(
        'Too many pending nutrition requests for this client',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    queue.pendingCount += 1;

    const task = queue.tail
      .then(() => this.performAnalysis(dto))
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

  private async performAnalysis(dto: AnalyzeImageDto): Promise<NutritionResponse> {
    const mimeType = this.resolveMimeType(dto);
    const base64Data = dto.imageBase64.replace(/^data:[^;]+;base64,/, '');
    const imageSize = Buffer.from(base64Data, 'base64').byteLength;

    // if (imageSize > MAX_IMAGE_SIZE_BYTES) {
    //   throw new BadRequestException('Image too large');
    // }

    if (!VALID_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Invalid image type');
    }

    const result: NutritionAnalysis = await this.anthropicService.analyzeImage(
      dto.imageBase64,
      mimeType,
      dto.description?.trim() || undefined,
      this.resolveLanguage(dto),
    );

    return {
      isValidFood: result.isValidFood,
      foodName: result.foodName,
      servingSize: result.servingSize,
      nutrients: result.nutrients,
      description: result.description,
    };
  }

  private getClientQueue(clientKey: string): ClientQueueState {
    const existingQueue = this.clientQueues.get(clientKey);
    if (existingQueue) {
      return existingQueue;
    }

    const queue: ClientQueueState = {
      pendingCount: 0,
      tail: Promise.resolve(),
      requests: new Map<string, Promise<NutritionResponse>>(),
    };
    this.clientQueues.set(clientKey, queue);
    return queue;
  }

  private createFingerprint(dto: AnalyzeImageDto): string {
    const mimeType = this.resolveMimeType(dto);
    const normalizedPayload = JSON.stringify({
      imageBase64: dto.imageBase64.replace(/^data:[^;]+;base64,/, ''),
      mimeType,
      description: dto.description?.trim() || '',
      language: this.resolveLanguage(dto),
    });

    return createHash('sha256').update(normalizedPayload).digest('hex');
  }

  private resolveMimeType(dto: AnalyzeImageDto): string {
    if (dto.mimeType) {
      return dto.mimeType;
    }

    const dataUrlMatch = dto.imageBase64.match(/^data:([^;]+);base64,/);
    return dataUrlMatch?.[1] ?? 'image/png';
  }

  private resolveLanguage(dto: AnalyzeImageDto): string {
    return dto.language?.trim() || this.config.nutrition.defaultLanguage;
  }
}
