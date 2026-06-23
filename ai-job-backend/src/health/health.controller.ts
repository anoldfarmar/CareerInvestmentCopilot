import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '服务健康检查' })
  check() {
    return this.healthService.check();
  }

  @Get('ready')
  @ApiOperation({ summary: '服务就绪检查' })
  ready() {
    return this.healthService.ready();
  }
}
