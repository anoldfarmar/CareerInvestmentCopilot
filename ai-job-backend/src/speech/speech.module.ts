import { Module } from '@nestjs/common';
import { AsrModule } from '../asr/asr.module';
import { SpeechController } from './speech.controller';
import { SpeechRealtimeGateway } from './speech-realtime.gateway';
import { SpeechService } from './speech.service';

@Module({
  imports: [AsrModule],
  controllers: [SpeechController],
  providers: [SpeechRealtimeGateway, SpeechService],
})
export class SpeechModule {}
