import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateResumeDto {
  // 标题用于在简历列表中快速区分不同版本。
  @ApiProperty({
    description: '简历标题',
    example: '前端工程师求职简历',
  })
  @IsString({ message: 'title 必须是字符串' })
  @IsNotEmpty({ message: 'title 不能为空' })
  @MaxLength(100, { message: 'title 最多只能包含 100 个字符' })
  title!: string;

  // 手动录入时可以直接传文本；上传解析流程中可以暂时不传。
  @ApiPropertyOptional({
    description: '上传文件解析出的原始文本，解析前可以不填写',
    example: '拥有 3 年前端开发经验，熟悉 Vue 和 React。',
  })
  @IsOptional()
  @IsString({ message: 'originalContent 必须是字符串' })
  @IsNotEmpty({ message: 'originalContent 不能为空' })
  originalContent?: string;
}
