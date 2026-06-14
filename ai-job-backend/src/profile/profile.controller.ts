import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户个人设置' })
  findMe(@CurrentUser() user: AuthUser) {
    return this.profileService.findMe(user.id);
  }

  @Put()
  @ApiOperation({ summary: '保存当前用户个人设置' })
  updateMe(@CurrentUser() user: AuthUser, @Body() body: UpdateProfileDto) {
    return this.profileService.updateMe(user.id, body);
  }
}
