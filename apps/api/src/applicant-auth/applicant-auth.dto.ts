import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../auth/password/password.policy';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const PASSWORD_MESSAGE = `Le mot de passe doit contenir entre ${PASSWORD_MIN_LENGTH} et ${PASSWORD_MAX_LENGTH} caractères`;

export class RegisterApplicantDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @Length(3, 120)
  email!: string;

  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: PASSWORD_MESSAGE,
  })
  password!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 80)
  firstName!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 80)
  lastName!: string;

  /** Date au format AAAA-MM-JJ. */
  @IsDateString({ strict: true }, { message: 'Date de naissance invalide' })
  birthDate!: string;

  @Transform(trim)
  @IsOptional()
  @Matches(/^\+?[0-9 ().-]{6,20}$/, { message: 'Numéro de téléphone invalide' })
  phone?: string;
}

export class ApplicantLoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @Length(3, 120)
  email!: string;

  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password!: string;
}

export class EmailDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @Length(3, 120)
  email!: string;
}

export class TokenDto {
  @IsString()
  @Length(20, 100)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: PASSWORD_MESSAGE,
  })
  password!: string;
}
