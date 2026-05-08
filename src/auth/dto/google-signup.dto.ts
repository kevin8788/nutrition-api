import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleSignupDto {
  @IsString()
  @MinLength(1)
  first_name: string;

  @IsString()
  @MinLength(1)
  last_name: string;

  @IsString()
  @MinLength(1)
  username: string;

  @IsDateString()
  dob: string;

  @IsOptional()
  @IsString()
  gender?: string;
}
