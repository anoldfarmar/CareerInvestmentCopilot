import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: '查询复盘报告列表' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.reportsService.findAll(user.id, query);
  }

  @Get(':reportId')
  @ApiOperation({ summary: '查询复盘报告详情' })
  @ApiParam({ name: 'reportId', description: '复盘报告 id' })
  findOne(@CurrentUser() user: AuthUser, @Param('reportId') reportId: string) {
    return this.reportsService.findOne(user.id, reportId);
  }

  @Post()
  @ApiOperation({ summary: '根据面试会话生成复盘报告' })
  generate(@CurrentUser() user: AuthUser, @Body() body: GenerateReportDto) {
    return this.reportsService.generate(user.id, body);
  }

  @Delete(':reportId')
  @ApiOperation({ summary: '删除复盘报告' })
  @ApiParam({ name: 'reportId', description: '复盘报告 id' })
  remove(@CurrentUser() user: AuthUser, @Param('reportId') reportId: string) {
    return this.reportsService.remove(user.id, reportId);
  }
}
