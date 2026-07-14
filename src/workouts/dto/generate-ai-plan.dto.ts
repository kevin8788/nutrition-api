import { IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateAiPlanDto {
  // Sent by the app but intentionally unused: the prompt is built server-side
  // from structured fields so clients cannot inject arbitrary instructions.
  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, any>;
}
