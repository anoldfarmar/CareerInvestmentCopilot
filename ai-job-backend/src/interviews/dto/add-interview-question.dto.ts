import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddInterviewQuestionDto {
  // 用户在题目预览阶段临时追加的问题，例如“再加 3 道技术题”中的具体补充方向。
  @ApiPropertyOptional({
    description: '自定义追加的问题内容；不传时后端会按当前面试类型自动追加一道题',
    example: '请追问我在项目中如何做性能优化和稳定性治理。',
  })
  @IsOptional()
  @IsString({ message: 'content 必须是字符串' })
  @MaxLength(500, { message: 'content 最多 500 个字符' })
  content?: string;

  // 追加题目维度，用于预览标签。MVP 先做有限枚举，避免前端展示失控。
  @ApiPropertyOptional({
    description: '题目维度',
    enum: ['general', 'professional', 'behavioral', 'stress', 'english'],
    example: 'professional',
  })
  @IsOptional()
  @IsIn(['general', 'professional', 'behavioral', 'stress', 'english'], {
    message: 'dimension 不在约定范围内',
  })
  dimension?: string;
}
