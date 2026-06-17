import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class TranscribeSpeechDto {
  @ApiPropertyOptional({
    description: '公网可访问的音频 URL；如果上传的是本地音频文件，可不传',
    example: 'https://example.com/interview-answer.webm',
  })
  @IsOptional()
  @IsString({ message: 'audioUrl 必须是字符串' })
  @IsUrl({}, { message: 'audioUrl 必须是合法 URL' })
  audioUrl?: string;
}
