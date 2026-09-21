import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CampaignType, StudyCycle } from '../../generated/prisma/client';

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CampaignRequirementDto {
  @IsString()
  @Length(1, 80)
  documentTypeCode!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(StudyCycle, { each: true })
  cycles?: StudyCycle[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class CreateCampaignDto {
  @IsEnum(CampaignType)
  type!: CampaignType;

  @IsUUID()
  academicYearId!: string;

  @Transform(trimOptional)
  @IsString()
  @Length(3, 120)
  title!: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  instructions?: string;

  @Type(() => Date)
  @IsDate()
  opensAt!: Date;

  @Type(() => Date)
  @IsDate()
  closesAt!: Date;

  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(60)
  maxAgeNonDoctoral?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignRequirementDto)
  requirements!: CampaignRequirementDto[];
}

export class UpdateCampaignDto {
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(3, 120)
  title?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  instructions?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  opensAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  closesAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(60)
  maxAgeNonDoctoral?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignRequirementDto)
  requirements?: CampaignRequirementDto[];
}

export class AcademicYearDto {
  /** Format AAAA-AAAA, ex. 2027-2028. */
  @Matches(/^\d{4}-\d{4}$/, { message: 'Code attendu au format 2027-2028' })
  code!: string;

  @Type(() => Date)
  @IsDate()
  startsOn!: Date;

  @Type(() => Date)
  @IsDate()
  endsOn!: Date;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class UpdateAcademicYearDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsOn?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsOn?: Date;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
