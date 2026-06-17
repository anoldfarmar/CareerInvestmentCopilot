import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SaveOptimizedResumeDto } from './save-optimized-resume.dto';

export class SaveResumeDraftDto {
  @ApiProperty({
    type: SaveOptimizedResumeDto,
    description: '当前正在编辑的优化稿草稿。',
  })
  @ValidateNested()
  @Type(() => SaveOptimizedResumeDto)
  content!: SaveOptimizedResumeDto;
}
