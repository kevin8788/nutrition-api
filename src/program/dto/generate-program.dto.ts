import { IsEnum, IsIn, IsNumber } from 'class-validator';

export class GenerateProgramDto {
  @IsNumber()
  @IsIn([4, 8, 12])
  duration_weeks: number;
}
