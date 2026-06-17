import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';
import { InterviewAiService } from './interview-ai.service';
import { InterviewRagService } from './interview-rag.service';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

@Module({
  imports: [PrismaModule, ReportsModule],
  controllers: [InterviewsController],
  providers: [InterviewAiService, InterviewRagService, InterviewsService],
  exports: [InterviewAiService, InterviewRagService, InterviewsService],
})
export class InterviewsModule {}
