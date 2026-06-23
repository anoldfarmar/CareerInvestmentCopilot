import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitAnswerDto {
  // 用户本轮回答内容。
  @ApiProperty({ description: '回答内容', example: '我在项目中负责了登录模块和权限控制...' })
  @IsString({ message: 'answer 必须是字符串' })
  @IsNotEmpty({ message: 'answer 不能为空' })
  answer!: string;
}
