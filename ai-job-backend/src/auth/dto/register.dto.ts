import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'xiaoming@example.com' })
  @IsEmail({}, { message: 'email 必须是合法的邮箱地址' })
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString({ message: 'password 必须是字符串' })
  @MinLength(8, { message: 'password 至少需要 8 个字符' })
  password!: string;

  @ApiPropertyOptional({ example: '小明' })
  @IsOptional()
  @IsString({ message: 'name 必须是字符串' })
  name?: string;
}
