import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
};

export class UploadDocumentDto {
  @Transform(trimOptionalString)
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 80)
  type: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Length(0, 120)
  label?: string;
}
