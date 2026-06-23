import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  // 编辑用户时，email 可以不提交；提交后仍然必须符合邮箱格式。
  @ApiPropertyOptional({
    description: '新的用户邮箱，不能和其他用户重复',
    example: 'new-email@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'email 必须是合法的邮箱地址' })
  email?: string;

  // 编辑用户时，name 也可以不提交。
  @ApiPropertyOptional({
    description: '新的用户姓名',
    example: '小明同学',
  })
  @IsOptional()
  @IsString({ message: 'name 必须是字符串' })
  @MaxLength(50, { message: 'name 最多只能包含 50 个字符' })
  name?: string;
}
