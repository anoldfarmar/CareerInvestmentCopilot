import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OverviewService } from './overview.service';

@ApiTags('overview')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户首页求职准备概览' })
  getOverview(@CurrentUser() user: AuthUser) {
    return this.overviewService.getOverview(user.id);
  }
}
