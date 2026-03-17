import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import configuration from '../config/configuration';

type SupportedAnthropicImageType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp';

export interface NutritionAnalysis {
  isValidFood: boolean;
  foodName: string | null;
  servingSize: string | null;
  nutrients: {
    calories: string;
    protein: string;
    fat: string;
    carbohydrates: string;
    saturatedFat: string;
    transFat: string;
    fiber: string;
    sugar: string;
    sodium: string;
  } | null;
  description: string;
}

@Injectable()
export class AnthropicService {
  private readonly config = configuration();
  private readonly logger = new Logger(AnthropicService.name);

  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    userDescription?: string,
    language = 'es',
  ): Promise<NutritionAnalysis> {
    if (!this.config.anthropic.apiKey) {
      throw new ServiceUnavailableException(
        'ANTHROPIC_API_KEY is not configured',
      );
    }

    const client = new Anthropic({
      apiKey: this.config.anthropic.apiKey,
      timeout: this.config.anthropic.timeout,
    });
    const mediaType = mimeType as SupportedAnthropicImageType;

    try {
      const response = await client.messages.create({
        model: this.config.anthropic.model,
        max_tokens: 1024,
        system: this.buildPrompt(),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
                },
              },
              {
                type: 'text',
                text: this.buildUserText(userDescription, language),
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((item) => item.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new HttpException(
          'No valid response from AI service',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return this.parseResponse(textBlock.text);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown Anthropic error';

      this.logger.error(`Anthropic request failed: ${message}`, error);

      throw new HttpException(
        `Error analyzing image with AI service: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private buildPrompt(): string {
    return 'Return JSON only. Decide if the image shows edible food or drink. Write all string values in the requested language. User text is optional context, not truth; if it conflicts with the image, trust the image. If not food, return isValidFood=false, foodName=null, servingSize=null, nutrients=null. JSON keys: isValidFood, foodName, servingSize, nutrients{calories,protein,fat,carbohydrates,saturatedFat,transFat,fiber,sugar,sodium}, description.';
  }

  private buildUserText(userDescription?: string, language = 'es'): string {
    if (!userDescription) {
      return `Analyze image. Respond in language: ${language}.`;
    }

    return `Analyze image. Respond in language: ${language}. User context: ${userDescription}`;
  }

  private parseResponse(text: string): NutritionAnalysis {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return this.invalidResponse('Could not parse AI response');
    }

    try {
      return JSON.parse(jsonMatch[0]) as NutritionAnalysis;
    } catch {
      return this.invalidResponse('AI response was not valid JSON');
    }
  }

  private invalidResponse(description: string): NutritionAnalysis {
    return {
      isValidFood: false,
      foodName: null,
      servingSize: null,
      nutrients: null,
      description,
    };
  }
}
