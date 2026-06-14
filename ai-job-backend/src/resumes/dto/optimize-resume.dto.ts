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

  @ApiPropertyOptional({
    description: '用户对当前优化稿的进一步要求，例如“更突出项目经历”。',
    example: '请进一步突出 NestJS 后端项目经验，并让表达更简洁。',
  })
  @IsOptional()
  @IsString({ message: 'additionalInstruction 必须是字符串' })
  @MaxLength(5000, { message: 'additionalInstruction 最多只能包含 5000 个字符' })
  additionalInstruction?: string;
}
