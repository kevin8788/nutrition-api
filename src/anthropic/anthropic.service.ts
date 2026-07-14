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

// Extra plan context forwarded from the app's PlanGenerationInput.
export interface WorkoutPlanContext {
  startDate?: string;
  durationWeeks?: number;
  healthFlags?: Record<string, unknown>;
  recentWorkoutLogs?: unknown[];
  recentWearableMetrics?: unknown[];
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

  async generateWorkoutPlan(
    profile: UserProfileData,
    context: WorkoutPlanContext = {},
  ): Promise<AiWorkoutPlan> {
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
        // A multi-week plan with per-session detail easily exceeds 2K tokens;
        // a tight budget truncates the JSON and the parse below fails.
        max_tokens: 8192,
        system:
          'You are FitWalk Coach, a safe beginner-focused walking/running coach for overweight users. Return valid JSON only — no markdown fences, no prose outside the JSON object.',
        messages: [{ role: 'user', content: this.buildWorkoutPlanPrompt(profile, context) }],
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

  // Mirrors the wire contract the app validates with aiPlanResponseSchema
  // (FitWalk-app src/validation/schemas.ts) — keep the two in sync.
  private buildWorkoutPlanPrompt(profile: UserProfileData, context: WorkoutPlanContext): string {
    const startDate = context.startDate ?? this.defaultStartDate();
    const durationWeeks = context.durationWeeks ?? 4;

    return `Create a realistic training plan based only on the structured user data provided.
Do not invent biometric data.
Prioritize safety, gradual progression, and consistency.
If user has joint pain or very low fitness, prefer walking and low-impact sessions.
Never increase duration, intensity, and frequency in the same week.
Use safe language ("reduce intensity", "stop if pain is sharp") — never "push through the pain".
If data is missing, list it in data_limitations instead of guessing.
Return valid JSON only.

User profile:
${JSON.stringify(profile, null, 2)}

Health flags:
${JSON.stringify(context.healthFlags ?? {}, null, 2)}

Recent wearable data:
${JSON.stringify(context.recentWearableMetrics ?? [], null, 2)}

Recent workout logs:
${JSON.stringify(context.recentWorkoutLogs ?? [], null, 2)}

Plan start date: ${startDate}
Plan duration in weeks: ${durationWeeks}

Output schema:
{
  "plan_name": "string",
  "duration_weeks": number,
  "weekly_schedule": [
    {
      "week": number,
      "sessions": [
        {
          "date": "YYYY-MM-DD",
          "type": "easy_walk | brisk_walk | walk_intervals | walk_run_intervals | treadmill_cardio | strength_low_impact | mobility | active_rest | rest",
          "duration_minutes": number,
          "distance_miles": number | null,
          "intensity": "easy | moderate | hard",
          "warmup": "string",
          "main_workout": "string",
          "cooldown": "string",
          "strength_optional": "string | null",
          "safety_notes": ["string"],
          "metrics_to_track": ["heart_rate | steps | distance | pace | perceived_exertion | pain_level"]
        }
      ]
    }
  ],
  "progression_notes": ["string"],
  "data_limitations": ["string"]
}`;
  }

  private defaultStartDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
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
