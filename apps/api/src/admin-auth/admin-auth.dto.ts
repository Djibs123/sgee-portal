import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AdminLoginDto {
  @Transform(trimString)
  @IsEmail()
  @Length(3, 120)
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
