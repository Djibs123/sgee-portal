import { Transform } from 'class-transformer';
import {
  IsBIC,
  IsEmail,
  IsIBAN,
  IsOptional,
  IsString,
  Length,
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

const compactUpperCase = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.replace(/\s+/g, '').toUpperCase() || undefined
    : value;

export class SubmitRibDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 120)
  banque!: string;

  /** IBAN international (registre ISO 13616) : format du pays et clé de contrôle. */
  @Transform(compactUpperCase)
  @IsIBAN({}, { message: 'IBAN invalide' })
  iban!: string;

  @Transform(compactUpperCase)
  @IsOptional()
  @IsBIC({ message: 'BIC invalide' })
  bic?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(1, 255)
  adresse?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(1, 30)
  telephone?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsEmail()
  @Length(1, 120)
  email?: string;
}
