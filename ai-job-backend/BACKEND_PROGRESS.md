# AI 求职助手后端开发记录

> 作用：这是项目的活文档。每次修改数据库、接口、第三方服务或大模型 JSON 结构后，都必须同步更新本文件。
>
> 最近更新：2026-06-01
>
> 前端活文档：`../front_pages/FRONTEND_PROGRESS.md`

## 1. 当前技术栈

- NestJS + TypeScript
- Prisma 7 + PostgreSQL 16
- Swagger：`http://localhost:3000/api-docs`
- 本地 Vite 前端：`http://localhost:5173`
- PostgreSQL Docker 容器：`ai-job-postgres`
- MinerU Agent 轻量解析 API：将 PDF 或 DOCX 转为 Markdown
- DeepSeek V4 Pro：将 Markdown 提取为结构化简历 JSON
- Puppeteer：将优化后的结构化简历渲染为 HTML，并打印成 PDF
- NestJS 已为本地 Vite 前端开启 CORS：`http://localhost:5173`

## 2. 项目运行

```bash
# 启动 PostgreSQL
docker compose up -d

# 应用已有数据库迁移
npx prisma migrate deploy

# 重新生成 Prisma Client
npx prisma generate

# 启动 NestJS 开发服务
npm run start:dev
```

## 3. 敏感配置规范

真实配置写在 `.env`，该文件已被 Git 忽略。可提交的配置示例写在 `.env.example`。

当前环境变量：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_job?schema=public"
MINERU_AGENT_BASE_URL="https://mineru.net/api/v1/agent"
DEEPSEEK_API_KEY="不要在文档中填写真实值"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-pro"
JWT_SECRET="生产环境必须替换为随机长字符串"
```

前端 `front_pages/.env.development` 当前使用：

```env
VITE_API_BASE_URL="http://localhost:3000"
VITE_USE_MOCK="false"
```

前端已接入 JWT 登录注册，不再使用临时用户 id。

注意事项：

- 不要在代码、Markdown 文档或 Git 仓库中写入真实 API Key。
- `*_api_key.txt` 已加入 `.gitignore`，但仍不建议在项目目录中保留明文密钥。
- 当前使用的 MinerU Agent 轻量 API 无需 Token，也无需 `Authorization` 请求头。
- DeepSeek API Key 只允许写入 `.env`。推荐变量名为 `DEEPSEEK_API_KEY`。
- 代码暂时兼容旧变量名 `Deepseek_API_KEY`，后续应统一改为全大写变量名。
- `JWT_SECRET` 用于签发登录 token。生产环境必须使用随机长字符串，禁止提交真实值。
- 如果未来切换为 MinerU 标准 API，应将密钥写入 `.env`，并在本文件记录新的环境变量名称，不记录密钥值。

## 4. 数据库模型

### User

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `Int` | 自增主键 |
| `email` | `String` | 唯一邮箱 |
| `name` | `String?` | 可选姓名 |
| `passwordHash` | `String?` | bcrypt 密码哈希；兼容旧测试用户，因此可空 |
| `createdAt` | `DateTime` | 创建时间 |
| `updatedAt` | `DateTime` | 更新时间 |
| `resumes` | `Resume[]` | 用户拥有的简历 |

### Resume

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `Int` | 自增主键 |
| `title` | `String` | 简历标题 |
| `originalContent` | `String` | MinerU 解析出的 Markdown；解析前默认空字符串 |
| `structuredContent` | `Json?` | 大模型提取出的结构化简历 |
| `optimizedContent` | `Json?` | 大模型优化后的结构化简历 |
| `mineruTaskId` | `String?` | MinerU 异步任务 id，唯一 |
| `parseStatus` | `String` | 解析状态，默认 `not_started` |
| `userId` | `Int` | 所属用户 id |
| `user` | `User` | 所属用户；删除用户时级联删除简历 |
| `createdAt` | `DateTime` | 创建时间 |
| `updatedAt` | `DateTime` | 更新时间 |

`parseStatus` 当前可能出现：

```text
not_started
pending
waiting-file
uploading
running
done
failed
```

## 5. 当前 API

### 基础接口

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/` | 返回 `Hello World!` |

### 用户接口

以下旧教学 CRUD 接口需要 JWT。产品注册请使用 `/auth/register`。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `POST` | `/users` | 创建用户 |
| `GET` | `/users` | 查询用户列表 |
| `GET` | `/users/:id` | 查询用户详情 |
| `PATCH` | `/users/:id` | 修改用户 |
| `DELETE` | `/users/:id` | 删除用户 |

### 认证接口

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `POST` | `/auth/register` | 注册用户并返回 JWT |
| `POST` | `/auth/login` | 登录并返回 JWT |
| `GET` | `/auth/me` | 使用 Bearer Token 查询当前用户 |

### 简历接口

以下简历接口全部需要：

```text
Authorization: Bearer <JWT>
```

简历归属从 JWT 中读取，不再接受前端传入 `userId`。用户只能访问自己的简历。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `POST` | `/resumes` | 创建简历记录；上传解析前可不传 `originalContent` |
| `GET` | `/resumes` | 查询简历列表，并附带用户基础信息 |
| `GET` | `/resumes/:id` | 查询简历详情 |
| `PATCH` | `/resumes/:id` | 修改标题或原始文本 |
| `DELETE` | `/resumes/:id` | 删除简历 |
| `POST` | `/resumes/upload` | 仅验证上传链路，不保存、不解析 |
| `POST` | `/resumes/:id/parse/upload` | 上传 PDF 或 DOCX，并将 MinerU 任务绑定到简历 |
| `GET` | `/resumes/:id/parse` | 查询 MinerU 状态；完成后自动保存 Markdown |
| `POST` | `/resumes/:id/structure` | 调用 DeepSeek V4 Pro，将 Markdown 转为结构化 JSON 并保存 |
| `PUT` | `/resumes/:id/structured-content` | 保存经过 DTO 校验的结构化简历 JSON |
| `PUT` | `/resumes/:id/optimized-content` | 保存经过 DTO 校验的优化稿 JSON |
| `POST` | `/resumes/:id/optimize` | 调用 DeepSeek 生成优化稿；JD 可选 |
| `POST` | `/resumes/:id/export/pdf?template=classic` | 将优化稿或结构化简历导出为 PDF 文件 |

## 6. MinerU 解析流程

当前采用异步签名上传：

```text
1. POST /resumes
   创建空简历记录，获得 resumeId

2. POST /resumes/:id/parse/upload
   后端向 MinerU 申请签名上传 URL
   后端将内存文件 PUT 到 MinerU OSS
   后端将 mineruTaskId 和 parseStatus 保存进 Resume

3. GET /resumes/:id/parse
   后端向 MinerU 查询状态
   未完成：同步 parseStatus
   已完成：下载 Markdown，并写入 Resume.originalContent
```

重要约束：

- 后端当前不会将上传的原始 PDF 或 DOCX 保存到本地磁盘。
- MinerU CDN 不应被视为永久存储。
- 中文文件名会经过 `normalizeUploadFilename()` 修复 UTF-8 / Latin-1 误解码。
- MinerU 轻量 API 当前限制最大 `10 MB`，PDF 页数限制以 MinerU 官方手册为准。

## 7. 结构化简历 JSON 合同

源码位置：

```text
src/resumes/dto/save-structured-resume.dto.ts
```

保存接口：

```text
PUT /resumes/:id/structured-content
```

当前 JSON 示例：

```json
{
  "basicInfo": {
    "name": "小明",
    "phone": "13800000000",
    "email": "xiaoming@example.com"
  },
  "summary": "3 年前端开发经验",
  "skills": ["Vue", "React", "TypeScript"],
  "workExperiences": [
    {
      "company": "示例科技有限公司",
      "position": "前端工程师",
      "startDate": "2023-01",
      "endDate": "2025-01",
      "description": "负责后台管理系统开发"
    }
  ],
  "projects": [
    {
      "name": "AI 求职助手",
      "description": "基于 NestJS 和 PostgreSQL 的求职助手。"
    }
  ],
  "educations": [
    {
      "school": "示例大学",
      "major": "计算机科学与技术",
      "degree": "本科"
    }
  ]
}
```

当前顶层字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `basicInfo` | `object?` | 基本信息 |
| `summary` | `string?` | 个人总结 |
| `skills` | `string[]?` | 技能列表 |
| `workExperiences` | `object[]?` | 工作经历 |
| `projects` | `object[]?` | 项目经历 |
| `educations` | `object[]?` | 教育经历 |

当前所有顶层字段都是可选字段。原因是不同用户的简历信息完整度不同。

当前已接入 DeepSeek V4 Pro：

```text
MinerU Markdown
→ POST /resumes/:id/structure
→ DeepSeek 按提示词输出 JSON
→ JSON.parse
→ SaveStructuredResumeDto 校验
→ 保存到 Resume.structuredContent
```

不要直接信任大模型输出。必须经过 JSON 解析和 DTO 校验后再写入数据库。

结构化提示词源码：

```text
src/resumes/prompts/resume-structure.prompt.ts
```

该提示词只负责忠实提取，不允许润色、补写或推测。简历优化必须使用另一套独立提示词。

项目经历提取要求：

- 需要重点识别“项目经历”“项目经验”“项目实践”“作品”“代表项目”“校园项目”“实习项目”等中文简历标题。
- 如果项目写在工作经历下面，但有明确项目名称，也应提取到 `projects`。
- `projects.name` 必须来自原文，不允许模型编造项目名称。

## 8. 优化稿 JSON 合同

源码位置：

```text
src/resumes/dto/save-optimized-resume.dto.ts
```

保存接口：

```text
PUT /resumes/:id/optimized-content
```

优化稿不会覆盖 `structuredContent`，而是单独保存到 `optimizedContent`，方便前端展示前后对比。

当前 JSON 示例：

```json
{
  "optimizedResume": {
    "basicInfo": {
      "name": "小明",
      "phone": "13800000000",
      "email": "xiaoming@example.com"
    },
    "summary": "3 年前端开发经验，具备复杂后台系统与组件库建设经验。",
    "skills": ["Vue", "React", "TypeScript"],
    "workExperiences": [],
    "projects": [],
    "educations": []
  },
  "optimizationNotes": [
    "强化了个人总结中的岗位匹配度",
    "将工作经历改写为更清晰的成果表达"
  ]
}
```

未来接入优化模型时：

```text
Resume.structuredContent
→ 独立的简历优化提示词
→ 大模型输出优化稿 JSON
→ SaveOptimizedResumeDto 校验
→ 保存到 Resume.optimizedContent
```

当前已接入 DeepSeek V4 Pro。调用：

```text
POST /resumes/:id/optimize
```

请求体支持两种模式：

```json
{}
```

不传 JD 时执行通用优化。

```json
{
  "jobDescription": "岗位要求：熟悉 TypeScript、React 和前端工程化。"
}
```

传入 JD 时执行岗位定向优化。

也支持多轮继续优化：

```json
{
  "jobDescription": "岗位要求：熟悉 TypeScript、React 和前端工程化。",
  "additionalInstruction": "请进一步突出项目经历，并让表达更简洁。"
}
```

当 `Resume.optimizedContent` 已存在时，后端会优先基于 `optimizedContent.optimizedResume` 继续优化；如果还没有优化稿，才从 `structuredContent` 开始。这样可以保留用户已经手动修改并保存过的优化稿。

优化提示词源码：

```text
src/resumes/prompts/resume-optimize.prompt.ts
```

关键约束：

- 允许优化表达，但禁止虚构事实、技能或量化结果。
- JD 中存在但简历未体现的能力，只能放进 `optimizationNotes` 作为建议。
- `basicInfo` 中的姓名、电话、邮箱只能原样保留。
- `additionalInstruction` 只能作为进一步表达优化要求，仍不能突破禁止虚构事实的规则。

## 9. 当前临时设计与后续调整点

## 9. PDF 导出流程

当前采用后端 HTML + Puppeteer 生成 PDF：

```text
Resume.optimizedContent.optimizedResume
→ 如果没有优化稿，则降级使用 Resume.structuredContent
→ 根据 template 生成 HTML 简历模板
→ Puppeteer 打开 HTML
→ page.pdf() 打印 A4 PDF
→ POST /resumes/:id/export/pdf 返回 application/pdf
```

接口：

```text
POST /resumes/:id/export/pdf?template=classic
```

模板参数：

| template | 风格 | 适合场景 |
| --- | --- | --- |
| `classic` | 经典单栏，ATS 友好 | 通用岗位、保守正式场景 |
| `modern` | 蓝绿渐变头部，模块卡片化 | 互联网、产品、技术岗 |
| `sidebar` | 左右分栏，技能和教育在侧栏 | 技能较多、内容层级丰富的简历 |

不传或传错 `template` 时，默认使用 `classic`。

响应：

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="resume-<id>-<template>.pdf"
```

运行说明：

- 本地开发优先使用 `PUPPETEER_EXECUTABLE_PATH` 指定的浏览器。
- 如果没有设置，会尝试使用 Windows 本机 Chrome 或 Edge。
- 如果部署到 Linux 服务器，需要确保容器或服务器里安装 Chromium/Chrome，或允许 Puppeteer 下载浏览器。
- 当前 PDF 不保存到本地磁盘，也不写入数据库，而是按需实时生成。

## 10. 当前临时设计与后续调整点

以下内容是刻意保留的 MVP 设计，不代表最终版本：

1. `parseStatus` 当前使用字符串。状态稳定后可改为 Prisma Enum。
2. `structuredContent` 和 `optimizedContent` 当前使用 PostgreSQL `Json`。结构稳定后再评估是否拆成多张表。
3. 已接入 DeepSeek 简历优化。后续可增加优化版本历史记录，而不是只保留最新结果。
4. `POST /resumes/upload` 只是上传链路调试接口。正式流程稳定后可以删除。
5. 当前通过前端轮询触发 Markdown 落库。后续可引入任务队列、定时任务或回调机制。
6. 当前未保存原始 PDF 或 DOCX。如果产品需要下载原文件，应接入 OSS / S3 类对象存储，数据库只保存 URL 和元信息。
7. 已接入 DeepSeek V4 Pro 实现 `Markdown → structuredContent`，并已打通 `structuredContent → optimizedContent → PDF 导出` 主链路。

## 11. 关键源码位置

| 文件 | 作用 |
| --- | --- |
| `prisma/schema.prisma` | 数据库模型 |
| `src/prisma/prisma.service.ts` | Prisma 7 PostgreSQL adapter 初始化 |
| `src/resumes/mineru.service.ts` | MinerU API 封装 |
| `src/resumes/deepseek.service.ts` | DeepSeek 结构化调用、JSON 解析和 DTO 校验 |
| `src/resumes/resumes.controller.ts` | 简历 HTTP 路由 |
| `src/resumes/resumes.service.ts` | 简历业务逻辑 |
| `src/resumes/resume-pdf.service.ts` | HTML 简历模板与 Puppeteer PDF 生成 |
| `src/resumes/pdf-templates/classic.template.ts` | 经典单栏 PDF 模板 |
| `src/resumes/pdf-templates/modern.template.ts` | 现代视觉 PDF 模板 |
| `src/resumes/pdf-templates/sidebar.template.ts` | 左右分栏 PDF 模板 |
| `src/resumes/dto/save-structured-resume.dto.ts` | 结构化简历 JSON 合同 |
| `src/resumes/dto/save-optimized-resume.dto.ts` | 优化稿 JSON 合同 |
| `src/resumes/prompts/resume-structure.prompt.ts` | 结构化简历提示词 |
| `src/resumes/prompts/resume-optimize.prompt.ts` | 简历优化提示词，支持可选 JD |
| `src/resumes/utils/normalize-upload-filename.ts` | 中文上传文件名修复 |

## 12. 每次变更后的维护清单

修改功能后，检查是否需要同步更新：

```text
[ ] BACKEND_PROGRESS.md 中的 API 列表
[ ] BACKEND_PROGRESS.md 中的数据库字段
[ ] BACKEND_PROGRESS.md 中的 JSON 合同和示例
[ ] .env.example 中的环境变量名称
[ ] Swagger 注解
[ ] Prisma Migration
[ ] npx prisma generate
[ ] npm run build
```

## 13. 自动化测试

当前执行命令：

```bash
npm test -- --runInBand
```

当前测试结果：

```text
5 个测试文件通过
11 个测试通过
```

重点业务规则覆盖：

- 没有 Markdown 时，不允许调用 DeepSeek 结构化简历。
- 没有 `structuredContent` 时，不允许调用 DeepSeek 优化简历。
- 传入 JD 时，会将 JD 交给 DeepSeek，并保存优化稿。
- Controller 和 Service 的基础依赖注入测试使用 mock，不连接真实数据库或第三方服务。

## 14. 前端联调进度

前端目录：

```text
../front_pages
```

已完成第一条真实联调流程：

```text
进入 /resume-optimize
→ 选择 PDF 或 DOCX
→ POST /resumes 创建空简历
→ POST /resumes/:id/parse/upload 上传至 MinerU
→ 前端每 2 秒调用 GET /resumes/:id/parse
→ MinerU 完成后，后端保存 Markdown
→ 前端展示 Markdown 和已有简历列表
```

当前说明：

- 前端开发环境已关闭简历解析流程的 Mock，指向 `http://localhost:3000`。
- NestJS 已允许 `http://localhost:5173` 跨域访问。
- 上传解析支持 PDF 和 DOCX，不支持旧版 DOC。
- 用户离开上传页面后再次进入时，前端会优先找到未完成任务，并恢复调用 `GET /resumes/:id/parse`。
- 下一步前端联调：点击按钮调用 `POST /resumes/:id/structure`，展示结构化 JSON。

## 15. 2026-06-11 PDF 模板补充

`resume_muban` 目录下的两个 GitHub 模板均为 MIT License：

- `jsonresume-theme-kendall-master`：参考为 `kendall` 内置模板，保留头像居中、深色外框、模块卡片的视觉方向。
- `jsonresume-theme-even-main`：参考为 `even` 内置模板，保留扁平、清爽、左侧信息栏的视觉方向。

后端没有直接把这两个模板作为 npm 依赖接入，原因是：

- `kendall` 原模板依赖 Mustache、lodash、gravatar 和外部 Bootstrap/CDN。
- `even` 原模板依赖 Vite 的 raw/inline import 和 ESM 构建产物。
- 为了让 Puppeteer PDF 导出更稳定，当前采用“视觉风格移植”为 NestJS 内部 HTML 模板的方式。

当前 PDF 导出模板参数：

| template | 来源/风格 | 说明 |
| --- | --- | --- |
| `classic` | 内置 | 经典单栏，ATS 友好 |
| `modern` | 内置 | 蓝绿色渐变头部，模块卡片 |
| `sidebar` | 内置 | 左侧栏布局 |
| `kendall` | 参考 jsonresume-theme-kendall | 头像居中、深色外框、经典简历感 |
| `even` | 参考 jsonresume-theme-even | 扁平清爽、左侧信息栏 |

Swagger 测试入口：

```text
POST /resumes/{id}/export/pdf?template=kendall
POST /resumes/{id}/export/pdf?template=even
```

## 16. 2026-06-11 主链路继续推进记录

目标：不再等待人工逐步确认，先把“上传简历 → MinerU 解析 → DeepSeek 结构化 → DeepSeek 优化 → 用户保存优化稿 → PDF 导出下载”的整体链路打通并补强边界。

当前主链路状态：

```text
前端 /resume-optimize
→ POST /resumes 创建简历记录
→ POST /resumes/:id/parse/upload 上传 PDF/DOCX 并创建 MinerU 任务
→ GET /resumes/:id/parse 轮询解析状态，完成后保存 Markdown 到 originalContent
→ POST /resumes/:id/structure 结构化 Markdown，保存到 structuredContent
→ PUT /resumes/:id/structured-content 保存用户人工确认后的结构化简历
→ POST /resumes/:id/optimize 结合可选 JD 生成优化稿，保存到 optimizedContent
→ PUT /resumes/:id/optimized-content 保存用户手动编辑后的优化稿
→ POST /resumes/:id/export/pdf?template=<template> 导出 PDF
```

本次后端补强：

- `POST /resumes/:id/export/pdf` 增加 `@HttpCode(200)`，避免 Swagger 显示默认 `201`，下载文件语义更清晰。
- `POST /resumes/:id/export/pdf` 增加 `@ApiOkResponse`，声明响应是 `application/pdf` 二进制文件。
- 模板参数仍由 `@ApiQuery` 暴露，支持：

```text
classic
modern
sidebar
kendall
even
```

本次前端联调补强：

- `front_pages/src/features/resume/api.ts` 已整理为正常中文注释。
- `exportResumePdf()` 使用 `responseType: "blob"` 接收 PDF。
- 如果 PDF 导出失败，且后端返回 JSON 错误但被浏览器包装成 Blob，前端会读取 Blob 文本并解析 `message`，再展示给用户。
- 简历优化页的当前简历卡片和优化稿弹窗都提供模板选择与 PDF 下载入口。

自测记录：

```bash
# 已通过
cd ai-job-backend && npm run build
cd ai-job-backend && npm test -- --runInBand
cd front_pages && npm run build
cd front_pages && npm test -- --run
```

当前自动化测试结果：

```text
后端：5 个测试文件通过，11 个测试通过
前端：1 个测试文件通过，1 个测试通过
```

后续继续推进优先级：

1. 完善导出体验：前端增加“导出中/下载成功/失败原因”的更明确反馈。
2. 增加 PDF 导出相关单元测试，覆盖无结构化内容、模板兜底、Blob 错误解析。
3. 评估是否保存 PDF 导出历史。如果产品需要“我的导出记录”，应新增表；当前仍是实时生成，不入库。
4. 进入下一条业务链路：JD 管理 / 投递记录 / 面试复盘，可先从 `Job` 或 `Application` 模型开始。

## 17. 2026-06-11 JD 管理后端地基

目标：为后续“针对某个岗位优化简历、保存投递记录、面试复盘”提供基础数据。当前只做岗位/JD 管理，不做自动投递。

新增数据库模型：

```prisma
model Job {
  id          Int      @id @default(autoincrement())
  title       String
  company     String?
  description String   @db.Text
  sourceUrl   String?
  status      String   @default("draft")
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

`User` 新增关系字段：

```prisma
jobs Job[]
```

当前岗位状态约定：

```text
draft
interested
applied
interviewing
offer
rejected
archived
```

新增迁移：

```text
prisma/migrations/20260611150500_add_job_management/migration.sql
```

已执行：

```bash
npx prisma migrate deploy
npx prisma generate
```

新增后端接口，全部需要 `Authorization: Bearer <JWT>`：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `POST` | `/jobs` | 创建目标岗位/JD |
| `GET` | `/jobs` | 查询当前用户保存的岗位列表 |
| `GET` | `/jobs/:id` | 查询岗位详情 |
| `PATCH` | `/jobs/:id` | 修改岗位/JD |
| `DELETE` | `/jobs/:id` | 删除岗位/JD |

关键归属规则：

- 后端从 JWT 中读取 `user.id`，前端不传 `userId`。
- `GET /jobs` 只返回当前用户自己的岗位。
- `GET/PATCH/DELETE /jobs/:id` 都会校验岗位是否属于当前用户，不属于时返回 404。

新增源码：

| 文件 | 作用 |
| --- | --- |
| `src/jobs/jobs.module.ts` | JD 管理模块 |
| `src/jobs/jobs.controller.ts` | `/jobs` HTTP 接口 |
| `src/jobs/jobs.service.ts` | 岗位归属校验与 Prisma 读写 |
| `src/jobs/dto/create-job.dto.ts` | 创建岗位 DTO |
| `src/jobs/dto/update-job.dto.ts` | 修改岗位 DTO |
| `src/jobs/job-status.ts` | 岗位状态常量 |
| `src/jobs/jobs.service.spec.ts` | 岗位服务单元测试 |

本次验证：

```bash
cd ai-job-backend && npm run build
cd ai-job-backend && npm test -- --runInBand
```

当前后端测试结果：

```text
6 个测试文件通过
15 个测试通过
```

下一步建议：

1. 前端增加“岗位/JD 管理”页面，先支持创建、列表、详情、编辑、删除。
2. 简历优化页的 JD 输入可以从已保存岗位中选择，也可以继续手动粘贴。
3. 后端后续可新增 `Application` 模型，把某份简历、某个岗位和投递状态关联起来。

前端接入进度：

- `front_pages/src/features/link/api.ts` 已改为调用真实 `/jobs` 接口。
- `front_pages/src/pages/LinkManagePage/LinkManagePage.tsx` 已升级为“岗位/JD 管理”页面。
- `front_pages/src/pages/ResumeOptimizePage/ResumeOptimizePage.tsx` 已支持从岗位库选择 JD，并自动填入简历优化表单。
- 为减少一次性改名风险，前端暂时保留旧路由 `/link-manage` 和旧模块名 `link`；业务含义已变为 Job/JD。

## 2026-06-11 剩余核心功能真实接口

本轮新增 Prisma 模型：
- `UserProfile`：保存“我的”页面个人偏好。
- `InterviewKnowledgeBase`：真实面试知识库。
- `RealInterviewRecord`：真实面试手动文本或音频元信息记录。
- `InterviewSession`：模拟面试会话和消息。
- `ReviewReport`：结构化复盘报告。

新增迁移：
```text
prisma/migrations/20260611162000_add_interview_profile_report/migration.sql
```

已执行：
```bash
npx prisma migrate deploy
npx prisma generate
```

新增接口，全部需要 `Authorization: Bearer <JWT>`：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/profile` | 获取当前用户个人设置 |
| `PUT` | `/profile` | 保存当前用户个人设置 |
| `GET` | `/interview-knowledge-bases` | 查询真实面试知识库列表 |
| `GET` | `/interview-knowledge-bases/:knowledgeBaseId` | 查询知识库详情 |
| `POST` | `/interview-knowledge-bases` | 创建知识库 |
| `POST` | `/interview-knowledge-bases/:knowledgeBaseId/records/manual` | 新增手动真实面试记录 |
| `POST` | `/interview-knowledge-bases/:knowledgeBaseId/records/audio` | 上传音频记录元信息 |
| `POST` | `/interviews/sessions` | 创建模拟面试会话 |
| `GET` | `/interviews/sessions/:sessionId` | 查询模拟面试会话 |
| `POST` | `/interviews/sessions/:sessionId/answer` | 提交一轮回答并生成下一题 |
| `POST` | `/interviews/sessions/:sessionId/end` | 结束模拟面试 |
| `GET` | `/interviews/sessions/:sessionId/progress` | 查询模拟面试进度 |
| `GET` | `/reports` | 查询复盘报告列表 |
| `GET` | `/reports/:reportId` | 查询复盘报告详情 |
| `POST` | `/reports` | 根据面试会话生成复盘报告 |

关键约定：
- 所有新数据都从 JWT 中读取 `user.id`，前端不传 `userId`。
- 知识库、面试会话、复盘报告都做了用户归属校验。
- 音频记录当前保存 `audioFileName`、`audioFileSize`、`status=processing`，暂不保存文件本体和转写文本。
- 模拟面试当前用规则生成问题，后续替换为 DeepSeek + 知识库 RAG。
- 复盘报告当前用规则评分和建议，后续替换为 DeepSeek 精评。

新增源码：
| 文件 | 作用 |
| --- | --- |
| `src/profile/*` | 个人设置接口 |
| `src/interview-knowledge-bases/*` | 真实面试知识库接口 |
| `src/interviews/*` | 模拟面试接口 |
| `src/reports/*` | 复盘报告接口 |
| `src/interviews/interviews.service.spec.ts` | 模拟面试服务测试 |
| `src/reports/reports.service.spec.ts` | 复盘报告服务测试 |

本轮验证：
```bash
cd ai-job-backend
npm run build
npm test -- --runInBand
```

结果：
```text
8 个测试文件通过
18 个测试用例通过
```

## 2026-06-12 契约补漏与真实接口烟测

本轮继续补齐页面级运行问题：
- [x] `POST /interviews/sessions/:sessionId/end` 后端返回值已改为 `InterviewProgress`，和前端 `endInterviewSession()` 类型一致。
- [x] 前端手动新增真实面试记录时，不再把路径参数 `knowledgeBaseId` 放进请求体，避免被后端严格 DTO 校验拒绝。
- [x] 生成复盘报告成功后，前端会写入报告详情缓存并刷新报告列表。
- [x] 侧边栏入口文案从“投递链接管理”改为“岗位/JD 管理”。
- [x] 旧版简历建议页和旧版对比页已改成兼容提示页，不再请求不存在的 `/resumes/:id/analysis`、`/resumes/:id/compare`。

真实 HTTP 烟测结果：
- [x] 注册临时用户并获取 JWT。
- [x] `PUT /profile` 保存个人设置成功。
- [x] `POST /interview-knowledge-bases` 创建知识库成功。
- [x] `POST /interview-knowledge-bases/:id/records/manual` 手动录入真实面试成功。
- [x] `POST /interviews/sessions` 创建模拟面试成功。
- [x] `POST /interviews/sessions/:id/answer` 提交回答成功。
- [x] `POST /interviews/sessions/:id/end` 返回 `stage=ended`。
- [x] `POST /reports` 生成复盘报告成功。

本轮验证：
```bash
cd ai-job-backend
npm run build
npm test -- --runInBand

cd front_pages
npm run build
npm test -- --run
```

## 2026-06-12 首页概览接口

新增首页真实统计接口：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/overview` | 获取当前用户首页求职准备概览 |

返回结构：
```ts
type HomeOverview = {
  kpis: { label: string; value: number; unit?: string }[];
  recentReportTitle: string;
  mode: string;
};
```

统计来源：
- `Resume`：已上传简历数量。
- `Resume.optimizedContent`：已优化简历数量。
- `InterviewSession`：模拟面试次数。
- `ReviewReport`：复盘报告数量与最近报告标题。
- `UserProfile.jobMode`：首页求职模式文案。

新增源码：
- `src/overview/overview.module.ts`
- `src/overview/overview.controller.ts`
- `src/overview/overview.service.ts`
- `src/overview/overview.service.spec.ts`

验证：
- `GET /overview` 真实 HTTP 烟测通过。
- 后端测试更新为 9 个测试文件、19 个测试用例通过。

## 2026-06-12 OPTIMIZATION_REQUIREMENTS_V1 P0 第一批落地

来源：`../OPTIMIZATION_REQUIREMENTS_V1.md`。

本轮已完成 P0-1 到 P0-6 的第一版工程落地，ASR 转写和 RAG 构建仍按要求只预留，不接真实能力。

### P0-1 第三方调用超时、重试、降级

新增：
- `src/common/http/external-http.client.ts`

能力：
- 所有第三方出网调用通过 `externalFetch()`。
- 使用 `AbortController` 强制超时。
- MinerU 查询和 Markdown 下载使用指数退避重试。
- DeepSeek/MinerU 错误返回用户可读提示，不透传第三方原始错误。
- 记录第三方调用耗时、状态码、结果，不记录密钥和完整简历内容。

已接入：
- `src/resumes/deepseek.service.ts`
- `src/resumes/mineru.service.ts`

### P0-2 密钥与配置安全治理

已完成：
- 后端只读取 `DEEPSEEK_API_KEY`。
- 删除旧变量 `Deepseek_API_KEY` 兼容。
- 本地 `.env` 已将旧变量名机械替换为 `DEEPSEEK_API_KEY`，未输出密钥值。
- `.env.example` 已重写，补充 Secret 注入和密钥安全提醒。
- 生产环境禁止默认 `JWT_SECRET`，并要求长度至少 24 字符。

注意：
- 当前真实 DeepSeek Key 应视为已暴露，仍建议在 DeepSeek 控制台轮换。

### P0-3 启动配置校验 + 健康检查

新增：
- `src/common/config/validate-env.ts`
- `src/health/health.module.ts`
- `src/health/health.controller.ts`
- `src/health/health.service.ts`

接口：
| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/health` | 服务健康检查，包含数据库连通性 |
| `GET` | `/health/ready` | 服务就绪检查，包含 DeepSeek/MinerU 配置状态，以及 ASR/RAG reserved 标记 |

### P0-4 全局异常结构 + requestId

新增：
- `src/common/middleware/request-id.middleware.ts`
- `src/common/filters/global-exception.filter.ts`

能力：
- 每个请求生成或透传 `x-request-id`。
- 错误响应统一为 `{ statusCode, message, requestId, timestamp }`。
- 生产环境 500 错误隐藏内部细节。

### P0-5 文件上传安全加固

新增：
- `src/resumes/utils/validate-resume-upload.ts`

能力：
- PDF 校验 `%PDF-` 魔数。
- DOCX 校验 ZIP 魔数 `PK\x03\x04` + `.docx` 后缀。
- 文件名去路径分隔符，使用白名单字符清理。
- 保留原有 5MB/10MB 大小限制。

### P0-6 关键写操作并发保护

新增 Resume 字段：
- `structureStatus String @default("idle")`
- `optimizeStatus String @default("idle")`

新增迁移：
```text
prisma/migrations/20260612093000_add_resume_ai_status/migration.sql
```

能力：
- `POST /resumes/:id/structure` 运行中重复提交返回 409。
- `POST /resumes/:id/optimize` 运行中重复提交返回 409。
- 成功时状态写为 `done`，失败时写为 `failed`。

本轮验证：
```bash
npx prisma migrate deploy
npx prisma generate
npm run build
npm test -- --runInBand
```

结果：
```text
后端构建通过
9 个测试文件通过
19 个测试用例通过
```

## 2026-06-12 OPTIMIZATION_REQUIREMENTS_V1 P1-7/P1-8/P1-9 落地

### P1-7 列表分页

新增通用分页能力：
- `src/common/pagination/pagination-query.dto.ts`
- `src/common/pagination/pagination.ts`

分页规范：
```ts
type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
```

已改造接口：
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/resumes?page=1&pageSize=20` | 简历列表分页 |
| `GET` | `/jobs?page=1&pageSize=20` | 岗位/JD 列表分页 |
| `GET` | `/reports?page=1&pageSize=20` | 复盘报告列表分页 |
| `GET` | `/interview-knowledge-bases?page=1&pageSize=20` | 真实面试知识库列表分页 |

约束：
- 默认 `page=1`。
- 默认 `pageSize=20`。
- `pageSize` 最大 100。

### P1-8 响应白名单与敏感字段保护

已完成：
- `GET /resumes` 不再 `include user`，避免任何用户对象字段被序列化到前端。
- 列表接口只返回业务所需字段或业务对象本体，不返回 `passwordHash`。
- 全局 ValidationPipe 已开启 `whitelist`、`forbidNonWhitelisted`、`transform`。

### P1-9 数据库索引

新增迁移：
```text
prisma/migrations/20260612103000_add_query_indexes/migration.sql
```

新增索引覆盖：
- `Resume(userId, createdAt)`
- `Resume(userId, updatedAt)`
- `Resume(parseStatus)`
- `Job(userId, updatedAt)`
- `Job(userId, status)`
- `InterviewKnowledgeBase(userId, updatedAt)`
- `RealInterviewRecord(knowledgeBaseId, createdAt)`
- `RealInterviewRecord(status)`
- `InterviewSession(userId, startedAt)`
- `InterviewSession(userId, ended)`
- `ReviewReport(userId, createdAt)`

本轮验证：
```bash
npx prisma migrate deploy
npx prisma generate
npm run build
npm test -- --runInBand
```

结果：
```text
后端构建通过
9 个测试文件通过
19 个测试用例通过
```
## 2026-06-12 面试 DeepSeek 接入与知识库构建

### 目标

- 模拟面试不再只依赖本地规则题，创建面试会话时优先调用 DeepSeek JSON Output 生成结构化题目。
- 真实面试知识库从“保存文本/音频元数据”升级为“可构建结构化素材 + RAG chunks”的中间层。
- ASR 暂不实现，但音频记录已保留 `asr_pending / waiting_asr` 状态，后续转写完成后可复用同一构建接口。

### 数据库变更

新增 migration：

```text
prisma/migrations/20260612172000_add_interview_knowledge_build/migration.sql
```

`RealInterviewRecord` 新增字段：

- `buildStatus String @default("not_built")`
- `buildError String? @db.Text`
- `structuredContent Json?`
- `chunks Json?`
- `@@index([buildStatus])`

状态约定：

- 手动文本记录：`status=ready`，有文本时 `buildStatus=not_built`。
- 音频记录：`status=asr_pending`，`buildStatus=waiting_asr`。
- 构建中：`buildStatus=building`。
- 构建成功：`buildStatus=built`，写入 `structuredContent` 和 `chunks`。
- 构建失败：`buildStatus=failed`，错误写入 `buildError`。

### 新增服务

新增：

```text
src/interviews/interview-ai.service.ts
```

能力：

- `generateQuestionPlan()`：调用 DeepSeek 生成结构化面试题，输出兼容 `InterviewQuestionPreview`。
- `buildKnowledgeRecord()`：把真实面试记录结构化为：
  - `summary`
  - `tags`
  - `focusAreas`
  - `questions`
  - `weakPoints`
  - `followUpSuggestions`
  - `chunks`

DeepSeek 请求仍统一使用：

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`
- `DEEPSEEK_TIMEOUT_MS`

### 面试题生成链路

`POST /interviews/sessions`：

- 若注入 `InterviewAiService`，优先读取用户勾选的知识库记录。
- 将 JD、面试类型、题目数量、语言、知识库 snippets 传给 DeepSeek。
- DeepSeek 返回题目不足时，用本地规则题补齐。
- DeepSeek 调用失败时，记录 warn 日志并回落到本地规则题，避免用户无法开始面试。

### 知识库构建接口

新增接口：

```text
POST /interview-knowledge-bases/:knowledgeBaseId/records/:recordId/build
```

用途：

- 对一条已有真实面试文本记录调用 DeepSeek 构建知识库素材。
- 成功后把结构化结果写入 `structuredContent`，把可检索片段写入 `chunks`。
- 如果记录没有 `transcript`，返回 400，提示 ASR 接入前不能构建。

### ASR 预留

`POST /interview-knowledge-bases/:knowledgeBaseId/records/audio` 当前仍只上传音频元数据：

- `audioFileName`
- `audioFileSize`
- `status=asr_pending`
- `buildStatus=waiting_asr`

后续 ASR 接入后建议流程：

1. 音频上传后创建 `asr_pending` 记录。
2. ASR worker 写入 `transcript`。
3. 将 `status` 更新为 `ready`，`buildStatus` 更新为 `not_built`。
4. 调用同一个 build 接口生成 `structuredContent/chunks`。

### 验证结果

```bash
npx prisma generate --schema prisma/schema.prisma
npm run build
npm test -- --runInBand
npx prisma migrate deploy
```

结果：

- 后端构建通过。
- 9 个 test suites passed。
- 23 个 tests passed。
- migration 已成功应用到本地 `ai_job` 数据库。
## 2026-06-12 面试实时问答与 AI 即时反馈

### 问题

此前模拟面试链路只完成了“生成题目”和“提交答案后推进下一题”：

- 用户回答后，后端只保存用户消息。
- assistant 只追加下一道题。
- 没有对当前回答进行即时点评。
- 聊天体验更像题目列表，不像真实 AI 面试官。

### 本次改进

`src/interviews/interview-ai.service.ts` 新增：

- `evaluateAnswer()`
  - 输入：当前题目、用户回答、JD、最近聊天上下文。
  - 调用 DeepSeek JSON Output。
  - 输出：
    - `feedback`
    - `strengths`
    - `improvements`
    - `followUp`
    - `score`

`src/interviews/interviews.service.ts` 改造 `submitAnswer()`：

1. 保存用户回答 message。
2. 找到当前题目。
3. 调用 DeepSeek 生成即时反馈。
4. 追加一条 `assistant` 消息：
   - `messageType=answer_feedback`
   - `sourceLabel=AI 即时反馈`
   - `feedbackScore`
   - `feedbackStrengths`
   - `feedbackImprovements`
5. 再追加下一题 message。
6. 如果没有下一题，追加结束提示 message：
   - `messageType=closing`

兜底策略：

- 如果 DeepSeek 点评失败，不中断面试。
- 后端会追加一条本地规则生成的即时反馈：
  - 回答偏短时提示补充 STAR。
  - 回答较完整时提示补充量化指标、技术取舍和贡献边界。

### 前端对齐

`front_pages/src/features/interview/types.ts` 新增消息字段：

- `messageType?: "question" | "answer_feedback" | "closing"`
- `feedbackScore?: number`
- `feedbackStrengths?: string[]`
- `feedbackImprovements?: string[]`

当前聊天页本身直接渲染 `messages`，所以后端追加反馈后，前端会自然显示：

```text
AI 提问
用户回答
AI 即时反馈
AI 下一题
```

### 验证结果

```bash
npm run build        # ai-job-backend
npm test -- --runInBand
npm run build        # front_pages
npm run lint         # front_pages
```

结果：

- 后端构建通过。
- 后端 9 个 test suites passed，23 个 tests passed。
- 前端构建通过。
- 前端 lint 通过。
## 2026-06-12 ASR 能力迁移到 ai-job-backend

### 目标

将既有项目中可用的 ASR 能力迁移进 `ai-job-backend`，让后端主项目具备独立的录音转写能力，不再依赖外部项目目录。

### 新增后端模块

新增目录：

```text
src/asr
```

包含：

- `asr.module.ts`
- `asr.service.ts`
- `asr.types.ts`
- `transcript.util.ts`

能力：

- 调用 DashScope Fun-ASR 创建异步转写任务。
- 轮询 DashScope task 状态。
- 下载 `transcription_url` 中的 ASR JSON。
- 解析纯文本 transcript。
- 生成 speaker transcript。
- 根据关键词和首轮说话特征推断“面试官 / 候选人”角色稿。

### 新增环境变量

```env
DASHSCOPE_API_KEY=""
DASHSCOPE_ASR_MODEL="fun-asr"
ASR_SPEAKER_COUNT="2"
ASR_LANGUAGE_HINTS="zh,en"
ASR_POLL_INTERVAL_MS="5000"
ASR_TIMEOUT_MS="600000"
ASR_HTTP_TIMEOUT_MS="30000"
```

重要限制：

- DashScope Fun-ASR 需要公网可访问的音频 URL。
- 本地上传的 `audioFile` 目前只保存文件名和大小。
- 若要真实转写，必须传入 `audioUrl`，后续正式部署建议接 OSS/S3/MinIO 生成可访问 URL。

### 数据库变更

新增 migration：

```text
prisma/migrations/20260612203000_add_asr_transcript_fields/migration.sql
```

`RealInterviewRecord` 新增字段：

- `audioUrl`
- `asrProvider`
- `asrModel`
- `asrRawJson`
- `speakerTranscript`
- `roleTranscript`
- `transcribedAt`

### 新增/增强接口

增强：

```text
POST /interview-knowledge-bases/:knowledgeBaseId/records/audio
```

- multipart 表单新增可选 `audioUrl`。
- 继续保存 `audioFileName / audioFileSize`。
- `audioUrl` 用于后续 ASR 转写。

新增：

```text
POST /interview-knowledge-bases/:knowledgeBaseId/records/:recordId/transcribe
```

请求体：

```json
{
  "audioUrl": "https://example.com/interview-audio.m4a"
}
```

行为：

1. 使用请求体中的 `audioUrl`，不传则使用记录中已保存的 `audioUrl`。
2. 调 DashScope Fun-ASR。
3. 写入：
   - `transcript`
   - `speakerTranscript`
   - `roleTranscript`
   - `asrRawJson`
   - `asrProvider`
   - `asrModel`
   - `transcribedAt`
4. 转写成功后：
   - `status=ready`
   - `buildStatus=not_built`
5. 转写失败后：
   - `status=failed`
   - `buildStatus=waiting_asr`
   - `buildError=<错误信息>`

### 前端对齐

- 真实面试录音上传弹窗新增可选公网音频 URL 输入。
- 知识库记录新增 ASR 字段类型：
  - `audioUrl`
  - `asrProvider`
  - `asrModel`
  - `speakerTranscript`
  - `roleTranscript`
  - `transcribedAt`
- 待转写记录如果存在 `audioUrl`，显示“开始转写”按钮。
- 转写完成后可继续点击“构建知识库”。

### 验证结果

```bash
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate deploy
npm run build        # ai-job-backend
npm test -- --runInBand
npm run build        # front_pages
npm run lint         # front_pages
npm test -- --run    # front_pages
```

结果：

- 后端构建通过。
- 后端 9 个 test suites passed，23 个 tests passed。
- 前端构建通过。
- 前端 lint 通过。
- 前端 2 个测试文件全部通过。
## 2026-06-12 模拟面试语音输入接入

目标：让前端“模拟面试”页面的语音按钮不再返回假文本，而是录音后调用后端 ASR 能力，把转写结果填回回答输入框。

### 后端新增接口

```text
POST /speech/transcribe
```

认证：需要 Bearer Token。

请求方式：`multipart/form-data`

字段：
- `audio`：浏览器录制的音频文件，字段名固定为 `audio`。
- `audioUrl`：可选。如果已经有公网可访问音频地址，也可以直接传 URL。

返回：

```json
{
  "text": "候选人：......",
  "status": "transcribed",
  "provider": "dashscope",
  "model": "fun-asr",
  "speakerTranscript": "说话人 1：......",
  "roleTranscript": "面试官：......\n候选人：......"
}
```

新增文件：
- `src/speech/speech.module.ts`
- `src/speech/speech.controller.ts`
- `src/speech/speech.service.ts`
- `src/speech/dto/transcribe-speech.dto.ts`

### 重要环境变量

```env
DASHSCOPE_API_KEY="你的 DashScope API Key"
DASHSCOPE_ASR_MODEL="fun-asr"
ASR_PUBLIC_BASE_URL="https://your-public-domain/asr-audios"
```

注意：DashScope Fun-ASR 需要公网可访问的音频 URL。浏览器直接上传本地录音时，后端会先保存到 `storage/asr-audios`，再用 `ASR_PUBLIC_BASE_URL` 拼出公网 URL。因此本地开发如果没有配置公网映射，接口会返回明确错误；部署时建议接 OSS/S3/MinIO 或给该目录配置静态公网访问。

### 前端对齐

- `front_pages/src/services/speech.ts`：从 mock 转写改为真实调用 `POST /speech/transcribe`。
- `front_pages/src/components/interview/VoiceInputBar/VoiceInputBar.tsx`：使用 `MediaRecorder` 录音，第二次点击停止录音并上传。
- 成功后将转写文本传给 `onTranscribed()`，自动填入模拟面试回答框。
- 失败时展示后端返回的错误信息，方便定位是麦克风权限、登录态还是公网音频 URL 配置问题。

### 本轮验证

```bash
npm run build        # ai-job-backend
npm run build        # front_pages
```
## 2026-06-12 模拟面试实时语音转写升级

本轮把模拟面试语音输入从“录完整段音频再上传”改成“生产同构的实时转写链路”。

### 后端

新增 WebSocket：

```text
GET /speech/realtime
```

连接示例：

```text
ws://localhost:3000/speech/realtime?token=<JWT>&sampleRate=16000&language=zh-CN
```

行为：

- 后端校验 JWT。
- 前端发送 16kHz 单声道 `pcm_s16le` 二进制音频帧。
- 后端连接 `REALTIME_ASR_WS_URL` 指向的本地实时 ASR 服务。
- 后端把 ASR 返回值归一化为 `ready / partial / final / error`。

新增文件：

- `src/speech/speech-realtime.gateway.ts`
- `REALTIME_ASR_SETUP.md`

新增依赖：

- `ws`
- `@types/ws`

新增环境变量：

```env
REALTIME_ASR_PROVIDER="sherpa-onnx"
REALTIME_ASR_WS_URL="ws://127.0.0.1:6006"
```

`GET /health/ready` 现在会返回 `realtimeAsr` 配置状态。

### 前端

- `front_pages/src/services/speech.ts` 新增 `startRealtimeTranscription()`。
- 前端用 `AudioContext` 采集麦克风音频。
- 音频被降采样为 16kHz，并编码为 PCM16。
- `VoiceInputBar` 改为实时连接：
  - 第一次点击：连接后端实时 ASR。
  - 录音中：实时 partial 文本写入回答框。
  - 第二次点击：停止录音。

### 分工

- `/speech/realtime`：模拟面试语音回答，低延迟流式转写。
- `POST /speech/transcribe`：真实面试长录音、知识库批量转写，继续使用 DashScope Fun-ASR。

### 验证

```bash
npm run build        # ai-job-backend
npm run build        # front_pages
```
## 2026-06-12 实时 ASR 切换为 vivo 蓝心云端方案

背景：目标部署服务器内存和算力较小，不适合长期运行本地 ASR 模型。模拟面试仍需要“边说边出字”的体验，因此将 `/speech/realtime` 的默认上游从本地 ASR WebSocket 改为 vivo 蓝心实时 ASR。

参考文档：

```text
https://aigc.vivo.com.cn/#/document/index?id=1738
```

### vivo 协议要点

- 上游地址：`wss://api-ai.vivo.com.cn/asr/v2`
- Header：`Authorization: Bearer <LANXIN_API_KEY>`
- 音频格式：16k / 16bit / 单声道 PCM
- 建连后先发送 text JSON：`type=started`
- 之后转发前端 binary PCM 音频帧
- 停止本句发送 binary：`--end--`
- 关闭连接发送 binary：`--close--`
- 通用能力 id：`shortasrinput`

### 后端变更

- `src/speech/speech-realtime.gateway.ts`
  - 新增 `REALTIME_ASR_PROVIDER=vivo` 内置适配。
  - 自动拼接 vivo ASR WebSocket URL。
  - 自动生成 `requestId`、32 位 `request_id` 和匿名化 `user_id`。
  - 将 vivo 返回的 `started / result / error` 归一化为前端统一的 `ready / partial / final / error`。
- `src/health/health.service.ts`
  - `realtimeAsr.configured` 在 vivo 模式下检查 `LANXIN_API_KEY`。
- `.env.example`
  - 新增 vivo/蓝心 ASR 所需环境变量。
- `REALTIME_ASR_SETUP.md`
  - 更新为 vivo 云端实时 ASR 方案说明。

### 密钥迁移

已从旧项目 `CareerInvestmentCopilot/apps/backend/.env` 中迁移以下变量到 `ai-job-backend/.env`：

- `LANXIN_API_BASE_URL`
- `LANXIN_APP_ID`
- `LANXIN_API_KEY`

密钥只写入本地 `.env`，不写入文档、不写入代码、不写入前端。

## 2026-06-12 vivo 实时 ASR 增量结果合并修正

问题现象：用户只说了一句“我之前的经历就是打过电赛拿过一次省三”，前端回答框里却出现了多段历史猜测文本，例如“我的小 / 我的项目经理 / 我的项目经理就是之前...”。这不是单纯的识别模型差，而是我们之前把 vivo 每一次 `action=result` 都当成最终句子追加了。

### 根因

vivo 实时 ASR 会持续返回修订中的结果：

- `data.result_id`：同一段结果的编号。
- `data.reformation`：是否是对上一段结果的修正。
- `data.is_last` / 顶层 `is_finish`：是否真正结束。

旧逻辑只看 `action=result`，导致中间态、修订态、最终态都被当成新句子拼到输入框里，所以出现重复和历史文本残留。

### 后端修正

- `src/speech/speech-realtime.gateway.ts`
  - 不再把 `action=result` 直接归类为 `final`。
  - 只有 `is_finish === true` 时才归一化为 `final`，普通识别结果统一作为 `partial`。
  - 透传 `resultId / reformation / isLast / isFinish` 给前端，让前端可以替换同一段结果，而不是盲目追加。
  - 增加轻量面试领域纠错：
    - `电塞` -> `电赛`
    - `小三` -> `省三`
    - 特定语境下的 `项目经理` -> `项目经历`

### 前端配合

前端 `VoiceInputBar` 根据 `resultId` 和 `reformation` 合并增量结果：

- 同一个 `resultId` 返回多次时，替换旧文本。
- `reformation === 1` 时，优先修正上一段结果。
- 只把稳定后的文本展示在回答输入框，避免把 ASR 的历史假设全部堆出来。

### 验证

```bash
npm run build        # front_pages
npm run lint         # front_pages
npm test -- --run    # front_pages
```

## 2026-06-12 vivo 实时 ASR 停顿后自动续句修正

问题现象：用户说完一段话停顿一下，再说下一段时，前端仍然显示正在录音，但输入框不再继续出现新文字。

### 根因

vivo 短语音实时 ASR 在检测到较长停顿后，会把当前识别轮次标记为 `is_finish=true`。这代表“本轮句子结束”，不是“用户整场录音结束”。旧逻辑收到 final 后只把文本回传给前端，没有重新开启下一轮识别，所以后续 PCM 音频还在转发，但上游已经不再处于可识别的新轮次。

### 修正

- `src/speech/speech-realtime.gateway.ts`
  - vivo/lanxin 模式下，收到 `type=final && isFinish=true` 后，后端自动向同一个上游 WebSocket 重新发送 `started`。
  - 增加 `LANXIN_ASR_RESTART_DELAY_MS` 隐式配置，默认 120ms，避免刚 finish 就立刻重启导致上游状态抖动。
  - 增加 `recognitionRestartTimer` 防抖，避免上游连续返回多个 finish 包时重复发送多次 `started`。
  - 用户关闭前端录音时会清理续句定时器，并发送 `--close--` 关闭 vivo 上游连接。
  - vivo 模式会忽略前端通用 `{ type: "start" }` 控制消息，因为后端已经负责发送 vivo 专用 `started` 包，避免格式不匹配的控制消息干扰上游。

### 验证

```bash
npm run build        # ai-job-backend
npm test -- --runInBand
```

## 2026-06-12 vivo 实时 ASR 长录音会话重连修正

用户反馈：停顿后第二句依旧没有响应。结论：只在同一个 vivo WebSocket 内重发 `started` 不够可靠，vivo 短语音能力在一次 `is_finish=true` 后可能已经结束当前上游识别会话。

### 新策略

前端到后端仍然只保持一条长连接：

```text
浏览器麦克风 -> ws://localhost:3000/speech/realtime
```

后端到 vivo 改为“短句会话自动重建”：

```text
第 1 句 -> vivo upstream #1 -> is_finish=true
后端自动关闭 upstream #1
后端自动创建 upstream #2
第 2 句 -> vivo upstream #2
```

### 关键实现

- `src/speech/speech-realtime.gateway.ts`
  - `upstream` 从固定常量改成可替换的 WebSocket。
  - 新增 `bindUpstream()`：统一绑定上游 open/message/error/close。
  - 新增 `reopenUpstream()`：每次续句都重新构造 vivo URL、requestId 和 WebSocket。
  - 收到 `final && isFinish=true` 后，把 `restartingUpstream` 立即置为 true，避免 vivo 主动关闭连接时误关前端连接。
  - 重连期间前端仍然可以录音，后端用 `pendingAudioFrames` 暂存最多 80 帧音频，防止第二句开头被吞掉。
  - `resultId` 加上 `recognitionRound * 100000` 偏移，避免 vivo 新会话里的 `result_id` 从 1 重新开始后覆盖前端第一句文本。

### 验证

```bash
npm run build        # ai-job-backend
npm test -- --runInBand
```

## 2026-06-12 前端实时 ASR 自动续连补强

用户再次反馈：后端自动重建 vivo 上游后，前端第二句话仍然没有响应；但手动停止录音再点击录音可以恢复。由此判断，除了后端上游续句，前端 `/speech/realtime` WebSocket 本身也需要在每个短句结束后自动重开。

### 新补强

- `front_pages/src/services/speech.ts`
  - 麦克风采集保持不停止。
  - 收到 `final && isFinish=true` 后，前端自动关闭当前 `/speech/realtime` WebSocket，并在 120ms 后重新连接。
  - 重连期间缓存最多 80 帧 PCM，避免第二句话开头被吞。
  - 使用前端 `connectionRound` 给每一轮 `resultId` 加偏移，避免新连接里 `resultId=1` 覆盖旧连接里的第一句话。
  - 用户不手动点“停止录音”，就不会真正释放麦克风和 AudioContext。
- `front_pages/src/components/interview/VoiceInputBar/VoiceInputBar.tsx`
  - 片段增加 `recognitionRound`。
  - `reformation=1` 只修订同一轮且未 finalized 的片段，避免第二轮文本覆盖第一轮文本。

### 当前连续语音策略

```text
用户点击一次录音
  -> 前端保持麦克风采集
  -> 每个短句结束后，前端自动重开 /speech/realtime
  -> 后端为每个连接代理到 vivo 实时 ASR
  -> 用户手动点停止录音时才真正结束
```

### 验证

```bash
npm run build        # front_pages
npm run lint         # front_pages
npm test -- --run    # front_pages
```

## 2026-06-12 vivo ASR 停顿 2 秒断句参数修正

用户反馈：连续说一大段话时，停顿 1 秒左右不会断；停顿 2 秒及以上后就不再响应。该现象与当前 `.env` 中的 `LANXIN_ASR_END_VAD_TIME_MS=2000` 完全吻合。

### 根因

`end_vad_time` 是 vivo ASR 的尾端静音检测时间。原配置 2000ms 会把用户正常思考时的 2 秒停顿判定为“本句结束”。对于模拟面试，产品语义应该是：用户不手动点“停止录音”，系统就持续接收语音。

### 修正

- `ai-job-backend/.env`
  - `LANXIN_ASR_END_VAD_TIME_MS=2000` -> `10000`
- `ai-job-backend/.env.example`
  - 默认值同步改为 `10000`
- `src/speech/speech-realtime.gateway.ts`
  - 代码默认值从 `2000` 改为 `10000`
- `REALTIME_ASR_SETUP.md`
  - 记录该参数用于避免 2 秒思考停顿被误判为结束。

### 验证

```bash
npm run build        # ai-job-backend
npm test -- --runInBand
```

## 2026-06-12 模拟面试改为同题多轮追问模式

用户反馈：AI 面试时不应该在每道题后立刻给即时反馈；反馈内容应该收敛到最后的 AI 总结/复盘里。每道题应当由用户和 AI 在同一题下轮询，AI 持续扮演面试官多角度追问，直到用户主动选择进入下一题。

### 后端调整

- `POST /interviews/sessions/:sessionId/answer`
  - 旧行为：记录用户回答 -> 生成即时反馈 -> 自动进入下一题。
  - 新行为：记录用户回答 -> 生成面试官追问 -> 停留在当前题。
- 新增接口：

```text
POST /interviews/sessions/:sessionId/next-question
```

用于用户主动进入下一题；如果已经没有下一题，则写入结束提示并标记会话结束。

- `InterviewAiService`
  - 新增 `generateFollowUpQuestion()`。
  - 提示词约束：只生成面试官追问，不评分、不总结优缺点、不输出即时反馈。
- `InterviewMessage.messageType`
  - 新增 `follow_up`。
  - 旧的 `answer_feedback` 暂时保留，后续用于最终总结/历史兼容。

### 测试

- 更新 `interviews.service.spec.ts`：
  - 提交回答后 currentQuestion 不变。
  - 提交回答后生成 `follow_up` 消息。
  - 新增“用户手动进入下一题时才推进 currentQuestion”的测试。

### 验证

```bash
npm run build        # ai-job-backend
npm test -- --runInBand
```

## 2026-06-12 复盘报告升级为 QA 级大模型点评

用户反馈：面试过程不应该即时反馈，但面试结束后的复盘报告必须调用大模型分析用户每次回答质量，指出正确/错误的地方，并给出“下次怎么改”。这类 QA 级点评是后续把面试过程和大模型点评沉淀为知识库的基础。

### 后端调整

- `src/reports/reports.service.ts`
  - 复盘报告生成从纯规则报告升级为“DeepSeek 优先，规则兜底”。
  - 生成报告前会先把面试消息按 `questionId` 聚合为 `QuestionThread`：
    - 原题
    - 用户多轮回答
    - AI 追问
    - 完整 QA transcript
  - 大模型提示词要求逐题输出：
    - `correctPoints`：答得正确/有效的地方
    - `wrongPoints`：错误、缺失、风险或模糊点
    - `diagnosis`：内容、逻辑、表达、深度四维诊断
    - `improvement`：下次怎么改、参考表达、练习要求
    - `knowledgeTags`：后续知识库标签
    - `qaTranscript`：本题 QA 记录
  - 如果缺少 `DEEPSEEK_API_KEY` 或调用失败，会自动使用本地规则报告兜底。
- `src/reports/reports.service.spec.ts`
  - 单元测试删除真实大模型依赖，强制走本地兜底。
  - 新增断言：报告中包含 `correctPoints / wrongPoints / knowledgeTags / qaTranscript`。

### 数据结构说明

当前数据库 `ReviewReport.questions` 是 JSON 字段，不需要新增迁移即可保存扩展结构。后续知识库构建可以直接读取：

```text
ReviewReport.questions[*].question
ReviewReport.questions[*].answer
ReviewReport.questions[*].correctPoints
ReviewReport.questions[*].wrongPoints
ReviewReport.questions[*].improvement
ReviewReport.questions[*].knowledgeTags
ReviewReport.questions[*].qaTranscript
```

### 验证

```bash
npm run build        # ai-job-backend
npm test -- --runInBand
```
## 2026-06-13 体验问题修复：导航、复盘删除、报告后台生成

- 前端主入口页修复底部导航：`简历优化` 和 `开始模拟面试` 页面不再隐藏底部五个主导航，方便用户在首页、简历、面试、复盘、我的之间切换。
- 复盘报告列表新增删除入口，调用后端已有 `DELETE /reports/:reportId`，删除后刷新报告列表。
- 面试结束时后端会自动触发复盘报告生成：`InterviewsService.endSession()` 结束会话后 fire-and-forget 调用 `ReportsService.generate()`。用户即使切到首页，服务端仍会继续生成报告。
- 前端复盘列表增加轻量轮询刷新；结束面试后也会延迟刷新报告缓存，让后台生成完成的报告自动出现在复盘列表中。

## 2026-06-13 参考 CareerInvestmentCopilot 迁入 RAG/上下文能力

- 参考 `CareerInvestmentCopilot/apps/backend/src/ai/json.ts`，新增 `src/common/ai/json.util.ts`，支持从 Markdown fenced code block 或普通文本中提取 JSON object，增强大模型 JSON 返回解析稳定性。
- 参考 `CareerInvestmentCopilot/apps/backend/src/ai/embedding.ts`，新增 `src/common/ai/local-embedding.util.ts`，提供本地 hash embedding 和 cosine similarity，作为轻量 RAG 检索兜底，不依赖外部 embedding 服务和 pgvector。
- 参考 `CareerInvestmentCopilot/apps/backend/src/rag/retriever.ts` 与 `src/mock-interview/context-builder.ts`，新增 `src/interviews/interview-rag.service.ts`，可从当前 `RealInterviewRecord.chunks` 中召回与本次简历/JD/面试类型最相关的片段，并构建模拟面试上下文。
- `InterviewsService` 的出题链路已接入 `InterviewRagService`：用户勾选真实面试知识库后，会先做本地相关性检索，再把 `rag-retrieval` 上下文送入 `InterviewAiService.generateQuestionPlan()`。
- `InterviewAiService` 已改用 `extractJsonObject()` 解析模型输出，降低 DeepSeek 返回 ```json 包裹内容时的失败率。
- 未直接迁入老项目依赖其独立 Prisma schema 的表结构和脚本，例如 `knowledge_chunks`、`reviewQaPair`、`reviewInsight` 脚本；这些能力已按当前 Nest/Prisma 数据模型重新适配。
## 2026-06-13 真实面试知识库音频上传修复

- 问题：复盘知识库导入 `.m4a` 录音时，Nest 内置 `FileTypeValidator` 把 `audio/x-m4a` 误判为不符合 `/^audio\/.+$/`，导致 `POST /interview-knowledge-bases/:id/records/audio` 返回 400。
- 后端修复：移除该接口上的内置文件类型校验，新增 `interview-knowledge-bases/utils/audio-upload.util.ts` 做自定义音频校验，支持 `m4a/mp3/wav/aac/ogg/webm/mp4/flac/amr`，兼容 `audio/x-m4a`、`video/mp4`、`application/octet-stream` 等常见上传 MIME。
- 后端流程优化：上传的知识库录音会保存到 `storage/knowledge-audios`。如果配置 `ASR_PUBLIC_BASE_URL` 或 `APP_PUBLIC_BASE_URL`，记录会自动生成 `/storage/knowledge-audios/<file>` 的公网 URL，供 DashScope ASR 后续转写。
- 静态文件：`main.ts` 新增 `/storage` 静态目录映射，`storage/asr-audios` 与 `storage/knowledge-audios` 都可以通过 `http://localhost:3000/storage/...` 本地访问；生产环境仍需要配置公网可访问域名给 ASR 厂商读取。
- ASR 清理：参考 `CareerInvestmentCopilot/apps/backend/src/asr` 的流程，保留“创建异步任务 -> 轮询 -> 下载结果 -> 说话人/角色格式化”的逻辑，并修复主项目 `asr.service.ts`、`transcript.util.ts` 中的乱码文案和角色识别关键词。
- 前端同步：知识库详情页的录音选择不再只依赖 `file.type.startsWith("audio/")`，兼容 `.m4a` 等文件扩展名和 `video/mp4` MIME。
- 环境配置：从本地 `.env2` 迁移 `DASHSCOPE_API_KEY` 到正式 `.env`，并补充 `DASHSCOPE_ASR_MODEL=fun-asr`、`ASR_LANGUAGE_HINTS=zh,en`、`ASR_SPEAKER_COUNT=2`。注意 `.env2` 中的 `PUBLIC_API_BASE_URL` 属于参考项目服务器，不能直接作为本机上传文件的公网 URL。
- 本机限制：私人电脑上的 `localhost/storage/...` 只能本机访问，DashScope 这类云端 ASR 无法读取；除非使用公网服务器、内网穿透或对象存储，否则“上传本地文件后自动转写”无法仅靠 API Key 解决。
- 兜底数据：已在知识库“第一次面试”中补充一条音频记录，`audioUrl` 指向 `http://120.79.220.126/asr-audio/d8df755aaf48a4e69343f054fa057eafa782c230/tencent_music_data_science.m4a`，状态为 `asr_pending` / `waiting_asr`，用于替代本地 MP4/M4A 上传测试 ASR 转写链路。
- 接口语义更新：`POST /interview-knowledge-bases/:knowledgeBaseId/records/audio` 改为 `audioFile` 与 `audioUrl` 二选一。后端 `ParseFilePipe` 允许不传文件；如果只传公网 URL，会直接创建 `sourceType=audio`、`status=asr_pending`、`buildStatus=waiting_asr` 的记录，后续点击“开始转写”时 ASR 直接读取该 URL。
- 前端同步：真实面试知识库的“导入面试录音”弹窗新增“公网 URL / 本地文件”二选一，默认选择“公网 URL”。这避免本机开发时用户误选本地文件后，云端 ASR 无法访问本机文件。

## 2026-06-13 模拟面试题目预览超时排查与修复

- 问题：用户在模拟面试中勾选真实面试知识库后，点击“生成题目预览”加载一段时间后停止且没有明显反馈；后端日志显示 DeepSeek 已返回 200。
- 原因判断：前端全局 axios 超时时间为 15 秒；真实面试知识库链路包含 RAG 召回、prompt 构建、DeepSeek 出题和数据库写入，整体可能超过 15 秒。即使 DeepSeek 单次调用很快，前端也可能先被 axios 取消，表现成“没反应”。
- 前端修复：`front_pages/src/features/interview/api.ts` 中 `createInterviewSession()` 为 `/interviews/sessions` 单独设置 `timeout: 120000`，不再受全局 15 秒限制。
- 前端体验：`InterviewSetupPage` 对 `createMutation.mutateAsync()` 增加错误捕获，至少会弹出 axios/后端错误，避免静默失败。
- 后端可观测性：`InterviewsService.createSession()`、`buildQuestionPlanWithAi()`、`loadKnowledgeSnippets()` 增加结构化日志：
  - `interview.createSession.start`
  - `interview.knowledgeSnippets.loaded`
  - `interview.questionPlan.ai.done`
  - `interview.createSession.done`
- 验证：`ai-job-backend npm run build`、`ai-job-backend npm test -- --runInBand`、`front_pages npm run build` 均通过。

## 2026-06-13 知识库内容查看入口

- 数据库位置：
  - `InterviewKnowledgeBase`：知识库壳子，保存名称、描述、所属用户。
  - `RealInterviewRecord`：知识库里的具体内容记录，保存 `transcript`、`speakerTranscript`、`roleTranscript`、`structuredContent`、`chunks`。
  - 当前项目没有单独叫 `KnowledgeChunk` 的表，RAG 片段暂存在 `RealInterviewRecord.chunks` JSON 字段中。
- 前端同步：真实面试知识库详情页每条记录新增“查看内容”按钮，可查看音频 URL、转写原文、说话人转写、角色转写、结构化内容和 RAG 检索片段。
- 如果 Prisma Studio 看不到 `InterviewKnowledgeBase` / `RealInterviewRecord`，通常是从错误目录启动了 Studio，或连接到了错误的 `DATABASE_URL`。应从 `ai-job-backend` 目录执行 `npx prisma studio`。

## 2026-06-13 参考后端迁入确认与测试补强

用户要求：`CareerInvestmentCopilot/apps/backend` 只作为参考代码，不在该目录编译；所有可用能力都应搬到 `ai-job-backend` 并确保主项目编译通过。

### 本轮确认

- 已按要求只读取 `CareerInvestmentCopilot/apps/backend` 中的代码，没有在参考目录执行构建。
- 参考项目是轻量 TypeScript + Prisma 脚本型后端，主项目是 NestJS 后端，因此没有整包复制，而是继续保持 Nest 模块化改造：
  - ASR：参考 `src/asr/transcript.ts` 的文本提取、说话人合并、角色识别逻辑，主项目落在 `src/asr/transcript.util.ts` 和 `AsrService`。
  - RAG：参考 `src/rag/retriever.ts`，主项目用本地 hash embedding + cosine similarity 落在 `src/interviews/interview-rag.service.ts`，不依赖 pgvector。
  - Mock 面试上下文：参考 `src/mock-interview/context-builder.ts`，主项目已经把知识库召回上下文注入 `InterviewsService` 的出题链路。
  - 复盘结构化：参考 `src/scripts/review-ai.ts`、`review-import.ts` 的 JSON 结构化思路，主项目复盘报告已在 `ReportsService` 中保存 QA 级点评结构，并保留本地规则兜底。

### 本轮新增测试

- `src/asr/transcript.util.spec.ts`
  - 覆盖 `extractText()`、`collectSentences()`、`formatSpeakerTranscript()`、`inferSpeakerRoles()`、`formatRoleTranscript()`。
  - 验证“面试官 / 候选人”角色识别在典型中文面试对话中可用。
- `src/interviews/interview-rag.service.spec.ts`
  - 覆盖已构建 chunks 的 RAG 召回。
  - 覆盖没有 chunks 时回退到 transcript 召回。
  - 覆盖模拟面试上下文 prompt 中包含召回证据。

### 验证

```bash
npm run build        # ai-job-backend，通过
npm test -- --runInBand
```

结果：

- Test Suites: 11 passed, 11 total
- Tests: 29 passed, 29 total

### 当前结论

`CareerInvestmentCopilot/apps/backend` 中与当前主线相关的 ASR / RAG / 复盘 / Mock 面试上下文能力，已经按 `ai-job-backend` 的 NestJS 架构迁入并验证可编译。暂未迁入参考项目中依赖独立 Prisma schema、pgvector 表和离线 CLI 的部分，原因是主项目当前数据模型不同，且 ASR/RAG 的外部能力按用户要求仍以预留和轻量本地兜底为主。
## 2026-06-14 知识库删除能力

- 后端新增 `DELETE /interview-knowledge-bases/:knowledgeBaseId`：删除当前用户自己的真实面试知识库。
- 后端新增 `DELETE /interview-knowledge-bases/:knowledgeBaseId/records/:recordId`：删除当前用户知识库中的单条真实面试记录。
- 删除知识库前会校验 `userId`，避免删除其他用户的数据。
- `RealInterviewRecord` 与 `InterviewKnowledgeBase` 的 Prisma 关系已配置 `onDelete: Cascade`，所以删除知识库时，其中的面试记录会被数据库自动级联删除。
- 前端知识库列表页新增小号“删除”按钮；知识库详情页每条面试记录新增小号“删除”按钮。
- 删除成功后前端会刷新 `interview-knowledge-bases` 查询缓存，列表和详情会同步更新。

## 2026-08-16 Speaker 流式 JSON 外壳展示修复

### 问题现象

- 专业模拟面试的追问气泡会直接显示
  `{"messageType":"follow_up","content":"..."}`，而不是只显示面试官话术。
- 异常 JSON 同时会被写入 `InterviewSession.messages[].content`。

### 根因

- 非流式 `runSpeaker()` 会解析 Speaker JSON 并提取 `content`。
- 流式 `streamSpeaker()` 复用了“严格返回 JSON”的提示词，却把 DeepSeek SSE 中的原始增量直接推送给前端，没有解析 JSON 外壳。
- 原单元测试只模拟了纯文本增量，没有覆盖真实模型的分片 JSON 输出。

### 修复

- 为流式 Speaker 使用独立提示词，要求只输出面试官自然语言，不输出 JSON、Markdown 或协议字段。
- 后端增加输出模式检测：
  - 纯文本继续实时推送；
  - 如果模型仍返回 JSON 或 JSON Markdown fence，先缓存完整结果，再只推送 `content`；
  - JSON 损坏时回退到 Strategist 的 `speakerInstruction`，不向用户展示协议层文本。
- 前端 `MockInterviewView` 增加历史消息兼容：对可解析的 Speaker JSON 只显示 `content`。
- 定点清理会话 `cmsvwebtk0000jcurntvlab8a` 中的一条异常消息：保留消息 ID、时间、题目关联和 `messageType`，仅将 `content` 改为自然语言正文。

### 验证

- `npm test -- --runInBand interview-ai.service.spec.ts`：4 项通过，包含分片 JSON 回归用例。
- `npm run build`（`ai-job-backend`）：通过。
- `npm run lint` 和 `npm run build`（`frontEnd`）：通过。
- 后端全量测试：14/16 个 suites、109/111 个 tests 通过。剩余 2 项为本修复范围外的现有 Mock 问题：
  - `resumes.service.spec.ts` 的 DeepSeek Mock 缺少 `analyzeJdMatch`，且断言未包含新的 `jdMatchResult`；
  - `overview.service.spec.ts` 的 Prisma Mock 缺少 `job.groupBy`。
