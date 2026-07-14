import { IsNumber, IsObject, IsOptional } from 'class-validator';

export class SaveAiPlanDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsObject()
  plan: Record<string, any>;
}
