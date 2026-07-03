import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateResumeVersionDto {
  @IsString({ message: '优化稿名称必须是字符串' })
  @MinLength(1, { message: '优化稿名称不能为空' })
  @MaxLength(80, { message: '优化稿名称不能超过 80 个字符' })
  label!: string;
}
