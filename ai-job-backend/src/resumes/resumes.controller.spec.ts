import { Test, TestingModule } from '@nestjs/testing';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ResumesController', () => {
  let controller: ResumesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumesController],
      // Controller 测试使用假的 Service，不连接数据库和第三方 API。
      providers: [
        {
          provide: ResumesService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<ResumesController>(ResumesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
