import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class AnalyzeImageDto {
  @IsString()
  @IsNotEmpty({ message: 'imageBase64 is required' })
  // @MaxLength(7_000_000, { message: 'imageBase64 payload is too large' })
  @Matches(/^(data:image\/[a-zA-Z0-9.+-]+;base64,)?[A-Za-z0-9+/=]+$/, {
    message: 'imageBase64 must be a valid Base64 payload',
  })
  imageBase64: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160, {
    message: 'description must be 160 characters or fewer',
  })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16, {
    message: 'language must be 16 characters or fewer',
  })
  @Matches(/^[a-z]{2,3}(-[A-Z]{2})?$/, {
    message: 'language must be a valid short language code like es or en-US',
  })
  language?: string;
}
