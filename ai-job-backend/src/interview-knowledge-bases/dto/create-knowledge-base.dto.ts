import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateKnowledgeBaseDto {
  // 知识库名称，例如“字节一面复盘”“前端高频题”。
  @ApiProperty({ description: '知识库名称', example: '前端真实面试复盘' })
  @IsString({ message: 'name 必须是字符串' })
  @IsNotEmpty({ message: 'name 不能为空' })
  @MaxLength(80, { message: 'name 最多 80 个字符' })
  name!: string;

  // 描述用于告诉自己这个知识库收集什么材料。
  @ApiPropertyOptional({ description: '知识库描述', example: '记录最近几轮前端面试问题和回答' })
  @IsOptional()
  @IsString({ message: 'description 必须是字符串' })
  @MaxLength(500, { message: 'description 最多 500 个字符' })
  description?: string;

  // 关注点是标签数组，例如 React、性能优化、项目复盘。
  @ApiPropertyOptional({
    description: '关注领域标签',
    example: ['React', '性能优化', '项目复盘'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'focusAreas 必须是数组' })
  @IsString({ each: true, message: 'focusAreas 中每一项都必须是字符串' })
  focusAreas?: string[];
}
