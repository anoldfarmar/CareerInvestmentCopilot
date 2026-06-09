import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// 将用户接口归类到 Swagger 页面中的 users 分组。
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /users 类似前端提交注册表单。
  @Post()
  @ApiOperation({ summary: '创建用户' })
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  // GET /users 类似前端进入列表页面时加载数据。
  @Get()
  @ApiOperation({ summary: '查询用户列表' })
  findAll() {
    return this.usersService.findAll();
  }

  // GET /users/:id 类似前端进入某个用户的详情页。
  @Get(':id')
  @ApiOperation({ summary: '根据 id 查询用户详情' })
  @ApiParam({ name: 'id', description: '用户 id', example: 1 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // PATCH /users/:id 类似前端编辑表单，只提交发生变化的字段。
  @Patch(':id')
  @ApiOperation({ summary: '根据 id 修改用户' })
  @ApiParam({ name: 'id', description: '用户 id', example: 1 })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.update(id, body);
  }

  // DELETE /users/:id 类似前端列表页点击删除按钮。
  @Delete(':id')
  @ApiOperation({ summary: '根据 id 删除用户' })
  @ApiParam({ name: 'id', description: '用户 id', example: 1 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
