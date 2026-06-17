import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SaveOptimizedResumeDto } from './save-optimized-resume.dto';

export class FinalizeResumeDto {
  @ApiProperty({
    type: SaveOptimizedResumeDto,
    required: false,
    description: '用户确认的最终优化稿；不传时后端会优先使用 draftContent，再使用 optimizedContent。',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SaveOptimizedResumeDto)
  content?: SaveOptimizedResumeDto;

  @ApiProperty({
    required: false,
    example: '最终版',
    description: '版本名称，展示给用户看的标签。',
  })
  @IsOptional()
  @IsString({ message: 'label 必须是字符串' })
  label?: string;
}
