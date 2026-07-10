import { IsOptional, Matches } from 'class-validator';

export class PlanDateQueryDto {
  /**
   * Client-local date anchor (YYYY-MM-DD). Without it the server falls back
   * to its own UTC date, which can be off by one day for the user.
   */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;
}
