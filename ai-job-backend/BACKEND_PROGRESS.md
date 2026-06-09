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

优化提示词源码：

```text
src/resumes/prompts/resume-optimize.prompt.ts
```

关键约束：

- 允许优化表达，但禁止虚构事实、技能或量化结果。
- JD 中存在但简历未体现的能力，只能放进 `optimizationNotes` 作为建议。
- `basicInfo` 中的姓名、电话、邮箱只能原样保留。

## 9. 当前临时设计与后续调整点

以下内容是刻意保留的 MVP 设计，不代表最终版本：

1. `parseStatus` 当前使用字符串。状态稳定后可改为 Prisma Enum。
2. `structuredContent` 和 `optimizedContent` 当前使用 PostgreSQL `Json`。结构稳定后再评估是否拆成多张表。
3. 已接入 DeepSeek 简历优化。后续可增加优化版本历史记录，而不是只保留最新结果。
4. `POST /resumes/upload` 只是上传链路调试接口。正式流程稳定后可以删除。
5. 当前通过前端轮询触发 Markdown 落库。后续可引入任务队列、定时任务或回调机制。
6. 当前未保存原始 PDF 或 DOCX。如果产品需要下载原文件，应接入 OSS / S3 类对象存储，数据库只保存 URL 和元信息。
7. 已接入 DeepSeek V4 Pro 实现 `Markdown → structuredContent`。尚未实现简历优化流程。

## 10. 关键源码位置

| 文件 | 作用 |
| --- | --- |
| `prisma/schema.prisma` | 数据库模型 |
| `src/prisma/prisma.service.ts` | Prisma 7 PostgreSQL adapter 初始化 |
| `src/resumes/mineru.service.ts` | MinerU API 封装 |
| `src/resumes/deepseek.service.ts` | DeepSeek 结构化调用、JSON 解析和 DTO 校验 |
| `src/resumes/resumes.controller.ts` | 简历 HTTP 路由 |
| `src/resumes/resumes.service.ts` | 简历业务逻辑 |
| `src/resumes/dto/save-structured-resume.dto.ts` | 结构化简历 JSON 合同 |
| `src/resumes/dto/save-optimized-resume.dto.ts` | 优化稿 JSON 合同 |
| `src/resumes/prompts/resume-structure.prompt.ts` | 结构化简历提示词 |
| `src/resumes/prompts/resume-optimize.prompt.ts` | 简历优化提示词，支持可选 JD |
| `src/resumes/utils/normalize-upload-filename.ts` | 中文上传文件名修复 |

## 11. 每次变更后的维护清单

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

## 12. 自动化测试

当前执行命令：

```bash
npm test -- --runInBand
```

当前测试结果：

```text
5 个测试文件通过
7 个测试通过
```

重点业务规则覆盖：

- 没有 Markdown 时，不允许调用 DeepSeek 结构化简历。
- 没有 `structuredContent` 时，不允许调用 DeepSeek 优化简历。
- 传入 JD 时，会将 JD 交给 DeepSeek，并保存优化稿。
- Controller 和 Service 的基础依赖注入测试使用 mock，不连接真实数据库或第三方服务。

## 13. 前端联调进度

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
