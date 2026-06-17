import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateReportDto {
  // 需要生成复盘报告的模拟面试会话 id。
  @ApiProperty({ description: '面试会话 id' })
  @IsString({ message: 'sessionId 必须是字符串' })
  @IsNotEmpty({ message: 'sessionId 不能为空' })
  sessionId!: string;
}
