import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../admin/admin.dto';
import {
  CampaignType,
  RequestStatus,
  StudyLevel,
} from '../../generated/prisma/client';

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

/** Les brouillons restent privés au demandeur : jamais listés côté instruction. */
export const REVIEWABLE_STATUSES = Object.values(RequestStatus).filter(
  (status) => status !== 'DRAFT',
);

export class ListRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @IsOptional()
  @IsIn(REVIEWABLE_STATUSES)
  status?: RequestStatus;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @IsOptional()
  @IsEnum(StudyLevel)
  targetLevel?: StudyLevel;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  hasWarnings?: boolean;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(2, 100)
  search?: string;
}

export class OptionalCommentDto {
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comment?: string;
}

export class RequiredCommentDto {
  @Transform(trimOptional)
  @IsString({ message: 'Un motif est obligatoire' })
  @Length(3, 1000)
  comment!: string;
}

export class DocumentToReplaceDto {
  @IsString()
  @Length(1, 80)
  documentTypeCode!: string;

  @Transform(trimOptional)
  @IsString()
  @Length(3, 500)
  comment!: string;
}

export class RequestInfoDto extends RequiredCommentDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentToReplaceDto)
  documents?: DocumentToReplaceDto[];
}
