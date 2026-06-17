import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateAudioRecordDto {
  // 音频记录标题。
  @ApiProperty({ description: '记录标题', example: '腾讯客户端面试录音' })
  @IsString({ message: 'title 必须是字符串' })
  @IsNotEmpty({ message: 'title 不能为空' })
  @MaxLength(120, { message: 'title 最多 120 个字符' })
  title!: string;

  // 音频对应的面试日期。
  @ApiProperty({ description: '面试日期', example: '2026-06-11' })
  @IsDateString({}, { message: 'interviewDate 必须是合法日期' })
  interviewDate!: string;

  // DashScope Fun-ASR 需要公网可访问的音频 URL。上传文件本体只保存元信息；
  // 如果提供 audioUrl，后端可以立即或手动触发 ASR 转写。
  @ApiPropertyOptional({
    description: '公网可访问的音频 URL，用于 DashScope ASR',
    example: 'https://example.com/interview-audio.m4a',
  })
  @IsOptional()
  @IsString({ message: 'audioUrl 必须是字符串' })
  @IsUrl({}, { message: 'audioUrl 必须是合法 URL' })
  audioUrl?: string;
}
