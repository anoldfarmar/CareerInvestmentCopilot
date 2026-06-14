import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// 前端传入目标 JD，后端基于“已结构化/已优化的简历内容”计算真实匹配度。
export class AnalyzeResumeMatchDto {
  @ApiProperty({
    description: '目标岗位 JD 文本，用于提取岗位关键词并计算简历匹配度。',
    example:
      '岗位要求：熟悉 TypeScript、React、Node.js，有复杂后台系统和性能优化经验。',
  })
  @IsString({ message: 'jobDescription 必须是字符串' })
  @IsNotEmpty({ message: 'jobDescription 不能为空' })
  @MaxLength(20000, { message: 'jobDescription 最多只能包含 20000 个字符' })
  jobDescription!: string;
}
