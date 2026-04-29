import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
};

export class UpdateRibDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  banque: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value,
  )
  @IsString()
  @Length(8, 34)
  @Matches(/^[A-Z0-9]+$/)
  iban: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Length(0, 255)
  adresse?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Length(0, 30)
  telephone?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsEmail()
  @Length(0, 120)
  email?: string;
}

export class UploadDocumentDto {
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
