import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { SaveStructuredResumeDto } from './save-structured-resume.dto';

// 优化结果不会覆盖原始结构化简历，而是单独保存一份优化稿。
// optimizationNotes 用于告诉用户模型具体调整了什么。
export class SaveOptimizedResumeDto {
  @ApiProperty({
    type: SaveStructuredResumeDto,
    description: '优化后的完整结构化简历',
  })
  @ValidateNested()
  @Type(() => SaveStructuredResumeDto)
  optimizedResume!: SaveStructuredResumeDto;

  @ApiProperty({
    description: '本次优化的修改摘要',
    example: ['强化了个人总结中的岗位匹配度', '将工作经历改写为更清晰的成果表达'],
  })
  @IsArray({ message: 'optimizationNotes 必须是数组' })
  @IsString({
    each: true,
    message: 'optimizationNotes 中的每一项都必须是字符串',
  })
  optimizationNotes!: string[];
}
