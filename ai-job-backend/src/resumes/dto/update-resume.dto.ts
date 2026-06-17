import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateResumeDto {
  // 编辑时，标题可以不提交；提交后仍然不能为空。
  @ApiPropertyOptional({
    description: '新的简历标题',
    example: '高级前端工程师求职简历',
  })
  @IsOptional()
  @IsString({ message: 'title 必须是字符串' })
  @IsNotEmpty({ message: 'title 不能为空' })
  @MaxLength(100, { message: 'title 最多只能包含 100 个字符' })
  title?: string;

  // 用户重新上传文件后，可以覆盖原始解析文本。
  @ApiPropertyOptional({
    description: '新的原始解析文本',
    example: '拥有 4 年前端开发经验，熟悉 Vue、React 和 TypeScript。',
  })
  @IsOptional()
  @IsString({ message: 'originalContent 必须是字符串' })
  @IsNotEmpty({ message: 'originalContent 不能为空' })
  originalContent?: string;

}
