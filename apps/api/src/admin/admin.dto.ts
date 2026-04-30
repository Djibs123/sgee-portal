import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
};

export class OptionalReviewCommentDto {
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reviewComment?: string;
}

export class RejectDto {
  @Transform(trimOptionalString)
  @IsString()
  @Length(3, 500)
  reviewComment!: string;
}
