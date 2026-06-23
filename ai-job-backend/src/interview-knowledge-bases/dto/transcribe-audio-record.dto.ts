import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class TranscribeAudioRecordDto {
  @ApiPropertyOptional({
    description: '公网可访问的音频 URL；不传时使用记录中已保存的 audioUrl',
    example: 'https://example.com/interview-audio.m4a',
  })
  @IsOptional()
  @IsString({ message: 'audioUrl 必须是字符串' })
  @IsUrl({}, { message: 'audioUrl 必须是合法 URL' })
  audioUrl?: string;
}
