import { PartialType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';

// 修改岗位时允许只传一部分字段，类似前端表单的“局部保存”。
export class UpdateJobDto extends PartialType(CreateJobDto) {}
