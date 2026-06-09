import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// 引入 Swagger 工具：
// DocumentBuilder 用于填写接口文档的基本信息。
// SwaggerModule 用于生成文档，并提供浏览器中的 Swagger UI 页面。
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // 创建 NestJS 应用实例，类似前端初始化一个 App。
  const app = await NestFactory.create(AppModule);

  // 允许本地 Vite 前端跨端口访问 NestJS。
  // 开发环境中前端通常运行在 5173 端口，后端运行在 3000 端口。
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // 类似为所有表单提交统一加一层校验中间件。
  app.useGlobalPipes(
    new ValidationPipe({
      // 删除 DTO 中没有声明的额外字段。
      whitelist: true,

      // 如果前端提交 DTO 之外的字段，直接返回错误，避免悄悄忽略。
      forbidNonWhitelisted: true,
    }),
  );
  // 填写 Swagger 文档的标题、简介和版本号。
  // 类似为一本产品说明书填写封面信息。
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI 求职助手 API')
    .setDescription('AI 求职助手后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // 根据项目中的接口生成 Swagger 文档。
  const swaggerDocumentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  // 将 Swagger UI 页面挂载到 /api-docs 路径。
  SwaggerModule.setup('api-docs', app, swaggerDocumentFactory);

  // 启动服务。没有设置 PORT 环境变量时，默认使用 3000 端口。
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
