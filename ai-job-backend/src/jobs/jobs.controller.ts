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
import { UpdateJobDto } from './dto/update-job.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: '创建目标岗位/JD' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateJobDto) {
    return this.jobsService.create(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: '查询当前用户保存的岗位列表' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.jobsService.findAll(user.id, query);
  }

  @Get('analysis/summary')
  @ApiOperation({ summary: '查询投递反馈分析摘要' })
  getAnalysis(@CurrentUser() user: AuthUser) {
    return this.jobsService.getAnalysis(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询岗位详情' })
  @ApiParam({ name: 'id', description: '岗位 id', example: 1 })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改岗位/JD' })
  @ApiParam({ name: 'id', description: '岗位 id', example: 1 })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateJobDto,
  ) {
    return this.jobsService.update(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除岗位/JD' })
  @ApiParam({ name: 'id', description: '岗位 id', example: 1 })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.remove(user.id, id);
  }
}
