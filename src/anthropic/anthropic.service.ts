import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import configuration from '../config/configuration';
import { AiWorkoutPlan } from '../workouts/interfaces/ai-plan.interface';

export interface UserProfileData {
  weight: number | null;
  height: number | null;
  activityLevel: string | null;
  dailyWalkingMinutes: number | null;
  hasRunBefore: boolean | null;
  daysPerWeek: number | null;
  preferredLocation: string | null;
  goalType: string | null;
  intensityPreference: string | null;
}

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

  async generateWorkoutPlan(profile: UserProfileData): Promise<AiWorkoutPlan> {
    if (!this.config.anthropic.apiKey) {
      throw new ServiceUnavailableException('ANTHROPIC_API_KEY is not configured');
    }

    const client = new Anthropic({
      apiKey: this.config.anthropic.apiKey,
      timeout: this.config.anthropic.timeout,
    });

    try {
      const response = await client.messages.create({
        model: this.config.anthropic.model,
        max_tokens: 2048,
        system:
          'Return JSON only. Generate a personalized weekly workout plan. JSON keys: summary (string), weeklySchedule (array of {day, workoutType, durationMinutes, intensity, description}), recommendations (array of strings). workoutType must be one of: walk, run, treadmill_cardio.',
        messages: [{ role: 'user', content: this.buildWorkoutPlanPrompt(profile) }],
      });

      const textBlock = response.content.find((item) => item.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new HttpException('No valid response from AI service', HttpStatus.BAD_GATEWAY);
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new HttpException('Could not parse AI response', HttpStatus.BAD_GATEWAY);
      }

      return JSON.parse(jsonMatch[0]) as AiWorkoutPlan;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const message = error instanceof Error ? error.message : 'Unknown Anthropic error';
      this.logger.error(`Anthropic workout plan request failed: ${message}`, error);
      throw new HttpException(
        `Error generating workout plan: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private buildWorkoutPlanPrompt(profile: UserProfileData): string {
    const parts: string[] = ['Generate a personalized weekly workout plan for this user:'];
    if (profile.weight) parts.push(`Weight: ${profile.weight}kg`);
    if (profile.height) parts.push(`Height: ${profile.height}cm`);
    if (profile.activityLevel) parts.push(`Activity level: ${profile.activityLevel}`);
    if (profile.daysPerWeek) parts.push(`Workout days per week: ${profile.daysPerWeek}`);
    if (profile.goalType) parts.push(`Goal: ${profile.goalType}`);
    if (profile.intensityPreference) parts.push(`Intensity preference: ${profile.intensityPreference}`);
    if (profile.preferredLocation) parts.push(`Preferred location: ${profile.preferredLocation}`);
    if (profile.hasRunBefore !== null) parts.push(`Has run before: ${profile.hasRunBefore}`);
    if (profile.dailyWalkingMinutes) parts.push(`Daily walking: ${profile.dailyWalkingMinutes} minutes`);
    return parts.join('\n');
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
