import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { RecommendJobsDto } from './dto/recommend-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobRecommendationService } from './job-recommendation.service';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobRecommendationService: JobRecommendationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a target job or JD' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateJobDto) {
    return this.jobsService.create(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List saved jobs for current user' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.jobsService.findAll(user.id, query);
  }

  @Get('analysis/summary')
  @ApiOperation({ summary: 'Get job application analysis summary' })
  getAnalysis(@CurrentUser() user: AuthUser) {
    return this.jobsService.getAnalysis(user.id);
  }

  @Post('recommendations')
  @ApiOperation({ summary: 'Recommend public job postings' })
  recommend(@CurrentUser() user: AuthUser, @Body() body: RecommendJobsDto) {
    return this.jobRecommendationService.recommendJobs(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job detail' })
  @ApiParam({ name: 'id', description: 'Job id', example: 1 })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job or JD' })
  @ApiParam({ name: 'id', description: 'Job id', example: 1 })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateJobDto,
  ) {
    return this.jobsService.update(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job or JD' })
  @ApiParam({ name: 'id', description: 'Job id', example: 1 })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.remove(user.id, id);
  }
}
