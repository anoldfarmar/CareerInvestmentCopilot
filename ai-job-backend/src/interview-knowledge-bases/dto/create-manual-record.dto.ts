import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateManualRecordDto {
  // 真实面试记录标题。
  @ApiProperty({ description: '记录标题', example: '某厂前端一面' })
  @IsString({ message: 'title 必须是字符串' })
  @IsNotEmpty({ message: 'title 不能为空' })
  @MaxLength(120, { message: 'title 最多 120 个字符' })
  title!: string;

  // 面试日期，前端一般传 YYYY-MM-DD。
  @ApiProperty({ description: '面试日期', example: '2026-06-11' })
  @IsDateString({}, { message: 'interviewDate 必须是合法日期' })
  interviewDate!: string;

  // 面试转写文本或手动复盘内容。
  @ApiPropertyOptional({ description: '面试文本内容', example: '面试官问了闭包、React diff、项目难点...' })
  @IsOptional()
  @IsString({ message: 'transcript 必须是字符串' })
  transcript?: string;
}
