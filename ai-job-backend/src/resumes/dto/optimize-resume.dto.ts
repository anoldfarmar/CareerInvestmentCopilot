import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// JD 可选：不填写时做通用优化，填写时做岗位定向优化。
export class OptimizeResumeDto {
  @ApiPropertyOptional({
    description: '目标岗位 JD。不填写时执行通用简历优化。',
    example:
      '岗位要求：熟悉 TypeScript、React 和前端工程化，有复杂后台系统经验。',
  })
  @IsOptional()
  @IsString({ message: 'jobDescription 必须是字符串' })
  @MaxLength(20000, { message: 'jobDescription 最多只能包含 20000 个字符' })
  jobDescription?: string;
}
