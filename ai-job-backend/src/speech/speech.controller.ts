import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TranscribeSpeechDto } from './dto/transcribe-speech.dto';
import { SpeechService } from './speech.service';

@ApiTags('speech')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  @Post('transcribe')
  @ApiOperation({ summary: '语音转文字，用于模拟面试语音回答' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audioUrl: {
          type: 'string',
          description: '公网可访问音频 URL；如果后端已配置 ASR_PUBLIC_BASE_URL，可只上传 audio 文件',
        },
        audio: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('audio'))
  transcribe(@Body() body: TranscribeSpeechDto, @UploadedFile() file?: Express.Multer.File) {
    return this.speechService.transcribe({ audioUrl: body.audioUrl, file });
  }
}
