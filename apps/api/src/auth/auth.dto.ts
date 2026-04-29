import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(3, 120)
  identifier!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
