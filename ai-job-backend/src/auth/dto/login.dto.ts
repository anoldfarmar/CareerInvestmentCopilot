import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'xiaoming@example.com' })
  @IsEmail({}, { message: 'email 必须是合法的邮箱地址' })
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString({ message: 'password 必须是字符串' })
  password!: string;
}
