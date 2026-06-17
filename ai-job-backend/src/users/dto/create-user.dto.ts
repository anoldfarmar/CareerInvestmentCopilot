import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
  // 告诉 Swagger：email 是必填字段，并展示示例。
  @ApiProperty({
    description: '用户邮箱，不能重复',
    example: 'xiaoming@example.com',
  })
  // 告诉 NestJS：email 必须符合邮箱格式。
  @IsEmail({}, { message: 'email 必须是合法的邮箱地址' })
  // ! 表示该字段会由 NestJS 根据请求体赋值，而不是在构造函数中赋值。
  email!: string;

  // 告诉 Swagger：name 是可选字段。
  @ApiPropertyOptional({
    description: '用户姓名，可以不填写',
    example: '小明',
  })
  // 可选字段没有提交时，不继续执行后面的校验规则。
  @IsOptional()
  // 如果提交了 name，它必须是字符串，并且最多 50 个字符。
  @IsString({ message: 'name 必须是字符串' })
  @MaxLength(50, { message: 'name 最多只能包含 50 个字符' })
  name?: string;
}
