import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { AcademicResult, StudyLevel } from '../../generated/prisma/client';

const trimOptional = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === '' ? undefined : trimmed;
};

export class CreateRequestDto {
  @IsUUID()
  campaignId!: string;
}

/** Champs modifiables d'une demande ; seuls ceux pertinents pour le type sont pris en compte. */
export class UpdateRequestDto {
  /** Version lue par le client (verrou optimiste), facultative. */
  @IsOptional()
  @IsInt()
  @Min(0)
  version?: number;

  @IsOptional()
  @IsEnum(StudyLevel)
  targetLevel?: StudyLevel;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  institution?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(2, 80)
  country?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  fieldOfStudy?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  programName?: string;

  @IsOptional()
  @IsEnum(StudyLevel)
  previousLevel?: StudyLevel;

  @IsOptional()
  @IsEnum(AcademicResult)
  previousResult?: AcademicResult;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  previousAverage?: number;

  @IsOptional()
  @IsBoolean()
  changedField?: boolean;

  @IsOptional()
  @IsBoolean()
  changedInstitution?: boolean;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(1, 20)
  baccalaureateSeries?: string;

  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2100)
  baccalaureateYear?: number;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(1, 40)
  baccalaureateMention?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  baccalaureateAverage?: number;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(20, 2000)
  motivation?: string;
}

export class SubmitRequestDto {
  /** Attestation sur l'honneur de l'exactitude des informations. */
  @Equals(true, { message: 'L’attestation sur l’honneur est obligatoire' })
  honorDeclaration!: boolean;
}

export class UploadRequestDocumentDto {
  @Transform(trimOptional)
  @IsString()
  @Length(1, 80)
  documentTypeCode!: string;
}
