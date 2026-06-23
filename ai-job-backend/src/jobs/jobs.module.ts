import { Module } from '@nestjs/common';
import { JobRecommendationService } from './job-recommendation.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobRecommendationService],
})
export class JobsModule {}
