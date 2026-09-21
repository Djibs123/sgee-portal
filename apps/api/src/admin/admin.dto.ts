import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

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

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class ListStudentsQueryDto extends PaginationQueryDto {
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;
}

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(1, 64)
  action?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(1, 64)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

export class RejectDto {
  @Transform(trimOptionalString)
  @IsString()
  @Length(3, 500)
  reviewComment!: string;
}
