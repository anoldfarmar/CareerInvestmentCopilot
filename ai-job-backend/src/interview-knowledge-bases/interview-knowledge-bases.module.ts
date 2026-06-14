import { Module } from '@nestjs/common';
import { AsrModule } from '../asr/asr.module';
import { InterviewAiService } from '../interviews/interview-ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InterviewKnowledgeBasesController } from './interview-knowledge-bases.controller';
import { InterviewKnowledgeBasesService } from './interview-knowledge-bases.service';

@Module({
  imports: [PrismaModule, AsrModule],
  controllers: [InterviewKnowledgeBasesController],
  providers: [InterviewAiService, InterviewKnowledgeBasesService],
})
export class InterviewKnowledgeBasesModule {}
