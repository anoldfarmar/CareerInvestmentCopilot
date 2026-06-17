# TypeScript 后端与 ASR 环境框架建议

本文档基于当前仓库文档、现有 FastAPI 骨架、Windows 本地 ASR demo 结果，以及职投 Copilot 的整体产品闭环，给出后续 TypeScript 后端环境和框架建设建议。

## 1. 当前现状判断

### 1.1 已经验证的部分

当前 ASR 面试复盘已经在 Windows 本地主机完成过一次端到端脚本验证，核心链路是可行的：

```txt
面试录音
  -> 阿里云 DashScope FunASR 转写
  -> 说话人分离 speaker_id
  -> 规则判断面试官 / 候选人
  -> 生成 role_transcript
  -> 大模型清洗和结构化复盘
  -> 输出 JSON
  -> 输出 Markdown 可视化报告
```

这说明项目最关键的不确定性已经被初步打通：录音可以转写，转写结果可以按角色整理，大模型可以基于 `role_transcript` 产出面试复盘 JSON。

### 1.2 仍然缺失的部分

当前流程仍然是脚本验证，不是正式后端服务。主要缺口包括：

- 没有正式的 TypeScript 后端工程。
- 服务器上的 Node.js、进程守护、反向代理、HTTPS、文件访问路径等还没有完善。
- ASR 仍依赖公网可访问音频 URL，上传后的音频如何被模型服务访问需要规范化。
- 没有任务队列和任务状态表，长音频转写不适合同步阻塞接口。
- 没有统一的 AI Provider Adapter，ASR、文本模型、备用模型调用方式还比较散。
- 没有数据库模型沉淀面试复盘、转写文本、知识库条目和任务状态。
- 没有面向 Android App 的稳定接口契约。

### 1.3 与原开发手册的差异

原开发手册推荐后端使用 Python FastAPI，当前仓库也已经有一个 FastAPI 最小骨架。但如果团队后端决定改用 TypeScript，建议不要把现有 Python 成果直接丢掉，而是采用以下定位：

```txt
Python demo = ASR 和 AI 复盘流程验证样例
TypeScript 后端 = 正式业务服务、API、任务编排、数据库和部署主体
```

也就是说，后续正式服务可以用 TypeScript 重写，但当前 Python 脚本中的调用参数、数据格式、角色判断逻辑、Prompt 输入输出结构，应作为迁移参考。

## 2. 推荐总体架构

复赛 Demo 阶段建议采用：

```txt
Android App
  -> TypeScript Backend
    -> SQLite / PostgreSQL
    -> Local File Storage
    -> Task Queue
    -> AI Service Adapter
      -> DashScope FunASR
      -> DashScope / 蓝心 / 其他文本模型
```

手机端只负责录音、文件选择、上传、状态轮询和结果展示。后端负责文件保存、生成公网可访问音频 URL、调用 ASR、角色识别、AI 复盘、数据库保存和知识库沉淀。

## 3. TypeScript 框架选择

### 3.1 推荐优先级

建议优先选择 NestJS，其次是 Fastify。

| 方案 | 推荐程度 | 适合原因 | 代价 |
| --- | --- | --- | --- |
| NestJS | 推荐 | 模块化强、结构清晰、适合多人协作、适合任务队列和依赖注入 | 初学成本略高 |
| Fastify | 可选 | 性能好、轻量、写法直接 | 大型业务模块需要自己约束结构 |
| Express | 不优先 | 上手简单 | 工程约束弱，后期容易散 |

对于职投 Copilot 这种包含简历、岗位、模拟面试、面试复盘、知识库多个模块的项目，NestJS 更适合做正式后端。

### 3.2 推荐技术栈

```txt
Runtime: Node.js 20 LTS
Language: TypeScript
Framework: NestJS
Package Manager: pnpm
Validation: zod 或 class-validator
ORM: Prisma
Database: SQLite 起步，后续 PostgreSQL
Task Queue: BullMQ + Redis
File Upload: Multer
HTTP Client: undici 或 axios
Config: @nestjs/config
API Docs: Swagger / OpenAPI
Process Manager: PM2
Reverse Proxy: Nginx
HTTPS: Certbot / 云厂商证书
```

如果服务器内存只有 2 GiB，Redis + Node + Nginx 仍可支撑 Demo，但要控制并发任务数量。比赛 Demo 阶段可以先使用 SQLite，等功能稳定后再迁移 PostgreSQL。

## 4. 推荐仓库结构

建议将 TypeScript 后端放在 `apps/backend`，如果要保留 Python demo，可以移动到 `apps/backend_legacy_py` 或 `scripts/asr_demo`，避免正式后端目录混杂两套运行时。

推荐结构：

```txt
apps/backend/
  package.json
  pnpm-lock.yaml
  tsconfig.json
  nest-cli.json
  prisma/
    schema.prisma
    migrations/
  src/
    main.ts
    app.module.ts
    common/
      response.ts
      errors.ts
      request-id.middleware.ts
    config/
      env.schema.ts
      configuration.ts
    modules/
      health/
      files/
      tasks/
      ai/
      reviews/
      knowledge/
      resumes/
      jobs/
      mock-interviews/
    workers/
      review.worker.ts
    prompts/
      interview_review.md
  uploads/
    audios/
    resumes/
  data/
    zhitou_copilot.sqlite3
  logs/
  .env.example
```

模块职责建议如下：

| 模块 | 主要职责 |
| --- | --- |
| `health` | 健康检查 |
| `files` | 文件上传、文件访问 URL、文件元数据 |
| `tasks` | 异步任务状态查询 |
| `ai` | 统一封装 ASR、文本生成、结构化输出 |
| `reviews` | 面试复盘主流程 |
| `knowledge` | 复盘结果沉淀为知识库 |
| `resumes` | 简历上传、解析、优化 |
| `jobs` | JD 导入、岗位匹配 |
| `mock-interviews` | 模拟面试会话和回答评分 |

## 5. ASR 面试复盘服务链路设计

### 5.1 正式接口链路

建议把面试复盘拆成上传、任务创建、状态查询、结果获取四段：

```txt
POST /api/v1/reviews/upload-audio
  -> 保存音频文件
  -> 创建 review 记录
  -> 创建 asr_review 任务
  -> 返回 review_id 和 task_id

GET /api/v1/tasks/{task_id}
  -> 返回 pending / running / succeeded / failed

GET /api/v1/reviews/{review_id}
  -> 返回复盘详情

POST /api/v1/reviews/{review_id}/reanalyze
  -> 用户修正文本后重新分析
```

长音频转写和大模型复盘不建议放在同步 HTTP 请求里完成。Android App 可以上传后轮询任务状态，或者后续接 WebSocket / Server-Sent Events。

### 5.2 后端内部处理流程

```txt
1. 用户上传音频
2. 后端保存到 uploads/audios/{review_id}/original.m4a
3. 后端生成公网可访问音频 URL
4. 调用 FunASR，开启 diarization_enabled
5. 保存原始 ASR JSON
6. 从 ASR JSON 提取 speaker transcript
7. 识别 speaker_id 对应角色
8. 生成 role_transcript
9. 调用文本模型生成结构化复盘 JSON
10. 校验 JSON Schema
11. 保存 review、qa_pairs、weaknesses、knowledge_items
12. 任务状态改为 succeeded
```

### 5.3 音频 URL 方案

FunASR 的 `file_urls` 需要公网可访问 URL，不能直接读取 Windows 本地路径。服务器上建议采用以下方案之一：

首选方案：

```txt
Android 上传音频 -> 后端保存本地 uploads -> Nginx 暴露 /static/uploads/ 只读访问 -> ASR 使用该公网 URL
```

示例：

```txt
https://api.example.com/static/uploads/audios/rev_001/original.m4a
```

注意事项：

- 文件名不要直接使用用户上传的中文名，统一生成 UUID 文件名。
- 数据库保存原始文件名和实际存储路径。
- Nginx 只开放必要目录，不开放整个项目目录。
- 如果涉及真实用户隐私，后续应改成对象存储临时签名 URL。

Demo 阶段可先用服务器本地文件 + Nginx 静态映射。长期运行建议迁移到 OSS / COS / S3 这类对象存储。

### 5.4 角色识别建议

当前脚本通过规则判断 `speaker_id` 对应面试官或候选人，这是合理的 Demo 起步方式。建议在 TypeScript 中封装为独立服务：

```txt
SpeakerRoleService
  -> inferRoles(segments): RoleMapping
```

初版规则可以沿用：

- 提问更多的一方更可能是面试官。
- 引导自我介绍的一方更可能是面试官。
- 追问“你刚才提到”“为什么”“怎么评价”的一方更可能是面试官。
- 回答姓名、学历、项目、实习经历的一方更可能是候选人。
- 介绍下一轮流程、面试反馈的一方更可能是面试官。

为了避免误判，建议在复盘结果页允许用户手动切换角色，并触发重新分析。

## 6. 数据库搭建与字段设计

### 6.1 数据库选型

Demo 阶段建议使用：

```txt
Prisma ORM + SQLite
```

原因：

- 不需要单独安装数据库服务，适合当前小服务器。
- Prisma 对 TypeScript 类型支持好，适合 NestJS。
- SQLite 文件便于备份，适合复赛 Demo。
- 后续可以把 `provider = "sqlite"` 切换成 `postgresql`，迁移到 PostgreSQL。

建议数据库文件位置：

```txt
apps/backend/data/zhitou_copilot.sqlite3
```

建议 Prisma 文件位置：

```txt
apps/backend/prisma/schema.prisma
```

`schema.prisma` 起步配置：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

`.env` 中配置：

```env
DATABASE_URL="file:./data/zhitou_copilot.sqlite3"
```

### 6.2 数据库分层原则

本项目不需要真的拆成多个物理数据库。建议先用一个 SQLite 数据库，通过不同表承载不同业务域：

```txt
用户域：users、user_profiles
文件域：files
面试复盘域：interview_reviews、review_audios、review_transcripts、review_qa_pairs、review_insights
知识库域：knowledge_items
任务域：tasks
AI 调用域：ai_call_logs
简历域：resumes
岗位域：job_descriptions、job_matches
模拟面试域：mock_interview_sessions、mock_interview_messages
```

如果后续访问量增加，再考虑把文件放对象存储、数据库迁移到 PostgreSQL，而不是一开始就拆多个库。

### 6.3 用户表

`users` 保存登录主体。Demo 阶段可以先做单用户或简单手机号/邮箱登录，但字段要为后续扩展预留。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键，建议 `cuid()` 或 UUID |
| `email` | `String?` | 否 | 邮箱，唯一索引，可后置登录 |
| `phone` | `String?` | 否 | 手机号，唯一索引 |
| `name` | `String?` | 否 | 用户昵称或真实姓名 |
| `avatar_url` | `String?` | 否 | 头像 URL |
| `role` | `String` | 是 | `user`、`admin`，默认 `user` |
| `status` | `String` | 是 | `active`、`disabled`、`deleted` |
| `created_at` | `DateTime` | 是 | 创建时间 |
| `updated_at` | `DateTime` | 是 | 更新时间 |

`user_profiles` 保存求职画像，不建议全部塞进 `users`。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `user_id` | `String` | 是 | 关联 `users.id`，唯一索引 |
| `education_level` | `String?` | 否 | 本科、硕士、博士等 |
| `school` | `String?` | 否 | 学校 |
| `major` | `String?` | 否 | 专业 |
| `target_roles` | `Json?` | 否 | 目标岗位数组，如数据分析、产品经理 |
| `target_cities` | `Json?` | 否 | 目标城市数组 |
| `skills` | `Json?` | 否 | 技能标签数组 |
| `career_direction` | `String?` | 否 | 求职方向摘要 |
| `created_at` | `DateTime` | 是 | 创建时间 |
| `updated_at` | `DateTime` | 是 | 更新时间 |

### 6.4 文件表

`files` 用于统一管理简历、录音、ASR JSON、报告等文件。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `user_id` | `String?` | 否 | 关联用户 |
| `biz_type` | `String` | 是 | `resume`、`interview_audio`、`asr_json`、`report` |
| `original_name` | `String` | 是 | 用户上传时的原始文件名 |
| `storage_name` | `String` | 是 | 服务器生成的安全文件名 |
| `storage_path` | `String` | 是 | 服务器本地路径 |
| `public_url` | `String?` | 否 | 可公网访问 URL，ASR 需要 |
| `mime_type` | `String?` | 否 | 文件 MIME 类型 |
| `size_bytes` | `Int?` | 否 | 文件大小 |
| `sha256` | `String?` | 否 | 文件哈希，用于去重和审计 |
| `status` | `String` | 是 | `uploaded`、`processing`、`ready`、`deleted` |
| `created_at` | `DateTime` | 是 | 创建时间 |
| `updated_at` | `DateTime` | 是 | 更新时间 |

### 6.5 面试复盘表

`interview_reviews` 是面试复盘主表，保存一次真实面试复盘的业务主体。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `user_id` | `String` | 是 | 关联用户 |
| `company_name` | `String?` | 否 | 公司名称 |
| `position_name` | `String?` | 否 | 岗位名称 |
| `interview_round` | `String?` | 否 | 一面、二面、HR 面等 |
| `interview_type` | `String?` | 否 | 技术面、项目面、HR 面、群面等 |
| `interviewed_at` | `DateTime?` | 否 | 面试发生时间 |
| `source_type` | `String` | 是 | `audio`、`manual_text`、`mixed` |
| `status` | `String` | 是 | `uploaded`、`transcribing`、`analyzing`、`completed`、`failed` |
| `overall_summary` | `String?` | 否 | 复盘总摘要 |
| `overall_score` | `Int?` | 否 | 可选评分，0-100 |
| `raw_review_json` | `Json?` | 否 | 大模型原始结构化结果 |
| `error_message` | `String?` | 否 | 失败原因 |
| `created_at` | `DateTime` | 是 | 创建时间 |
| `updated_at` | `DateTime` | 是 | 更新时间 |

`review_audios` 保存音频与复盘的关系。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `review_id` | `String` | 是 | 关联 `interview_reviews.id` |
| `file_id` | `String` | 是 | 关联 `files.id` |
| `duration_seconds` | `Int?` | 否 | 音频时长 |
| `sample_rate` | `Int?` | 否 | 采样率 |
| `channel_count` | `Int?` | 否 | 声道数 |
| `created_at` | `DateTime` | 是 | 创建时间 |

`review_transcripts` 保存 ASR、说话人分离、角色文本和清洗稿。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `review_id` | `String` | 是 | 关联复盘 |
| `asr_provider` | `String` | 是 | `dashscope`、`lanxin` 等 |
| `asr_model` | `String?` | 否 | 如 `fun-asr` |
| `asr_task_id` | `String?` | 否 | 第三方 ASR 任务 ID |
| `asr_raw_json` | `Json?` | 否 | 原始 ASR JSON，较大时可只存文件路径 |
| `asr_raw_file_id` | `String?` | 否 | 关联 `files.id` |
| `speaker_segments` | `Json?` | 否 | 带 `speaker_id` 的分句数组 |
| `speaker_text` | `String?` | 否 | 按 speaker_id 整理的文本 |
| `role_mapping` | `Json?` | 否 | 如 `{ "0": "interviewer", "1": "candidate" }` |
| `role_text` | `String?` | 否 | 面试官 / 候选人格式文本 |
| `clean_text` | `String?` | 否 | 大模型清洗后的文本 |
| `language_hints` | `Json?` | 否 | 如 `["zh", "en"]` |
| `created_at` | `DateTime` | 是 | 创建时间 |
| `updated_at` | `DateTime` | 是 | 更新时间 |

`review_qa_pairs` 保存面试问题和回答表现，是前端展示和知识库沉淀的核心。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `review_id` | `String` | 是 | 关联复盘 |
| `order_no` | `Int` | 是 | 问题顺序 |
| `question` | `String` | 是 | 面试官问题 |
| `answer_summary` | `String?` | 否 | 候选人回答摘要 |
| `answer_text` | `String?` | 否 | 原始或清洗后的回答正文 |
| `interviewer_followups` | `Json?` | 否 | 追问列表 |
| `tags` | `Json?` | 否 | 标签，如项目、SQL、机器学习 |
| `score` | `Int?` | 否 | 单题表现评分 |
| `strengths` | `Json?` | 否 | 该题亮点 |
| `weaknesses` | `Json?` | 否 | 该题问题 |
| `improvement_advice` | `String?` | 否 | 改进建议 |
| `created_at` | `DateTime` | 是 | 创建时间 |

`review_insights` 保存从一次复盘中抽取出的总结类结论。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `review_id` | `String` | 是 | 关联复盘 |
| `type` | `String` | 是 | `strength`、`weakness`、`advice`、`risk`、`next_action` |
| `title` | `String` | 是 | 结论标题 |
| `content` | `String` | 是 | 详细内容 |
| `severity` | `String?` | 否 | `low`、`medium`、`high` |
| `tags` | `Json?` | 否 | 标签数组 |
| `created_at` | `DateTime` | 是 | 创建时间 |

### 6.6 知识库表

知识库不是单独一个文件夹，而是一组结构化表。第一版可以先用一张 `knowledge_items` 表承载，后续再扩展向量检索。

`knowledge_items` 字段建议：

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `user_id` | `String` | 是 | 关联用户 |
| `source_type` | `String` | 是 | `review`、`mock_interview`、`resume`、`job_match`、`manual` |
| `source_id` | `String?` | 否 | 来源业务 ID，如 `review_id` |
| `type` | `String` | 是 | `question`、`weakness`、`advice`、`skill_gap`、`answer_template`、`company_note` |
| `title` | `String` | 是 | 知识条目标题 |
| `content` | `String` | 是 | 知识正文 |
| `summary` | `String?` | 否 | 短摘要，列表页使用 |
| `tags` | `Json?` | 否 | 标签，如 SQL、项目表达、职业规划 |
| `priority` | `Int` | 是 | 优先级，默认 0 |
| `mastery_level` | `String?` | 否 | `unknown`、`weak`、`improving`、`mastered` |
| `next_review_at` | `DateTime?` | 否 | 下次复习时间 |
| `embedding` | `Json?` | 否 | Demo 先不做向量库时可为空 |
| `status` | `String` | 是 | `active`、`archived`、`deleted` |
| `created_at` | `DateTime` | 是 | 创建时间 |
| `updated_at` | `DateTime` | 是 | 更新时间 |

后续如果要做 RAG，可以增加：

```txt
knowledge_chunks
  -> id
  -> knowledge_item_id
  -> chunk_text
  -> embedding
  -> metadata
```

SQLite 不适合长期做高质量向量检索。Demo 阶段可以先用关键词和标签检索，后续再引入 PostgreSQL + pgvector 或专门的向量数据库。

### 6.7 异步任务表

`tasks` 用于支撑 ASR、AI 分析、简历解析等耗时任务。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `user_id` | `String?` | 否 | 关联用户 |
| `type` | `String` | 是 | `review_asr`、`review_analyze`、`resume_parse`、`job_match` |
| `biz_id` | `String?` | 否 | 关联业务 ID，如 `review_id` |
| `status` | `String` | 是 | `pending`、`running`、`succeeded`、`failed`、`cancelled` |
| `progress` | `Int` | 是 | 0-100 |
| `current_step` | `String?` | 否 | 当前步骤说明 |
| `input` | `Json?` | 否 | 任务输入摘要 |
| `output` | `Json?` | 否 | 任务输出摘要 |
| `error_code` | `String?` | 否 | 错误码 |
| `error_message` | `String?` | 否 | 错误详情 |
| `started_at` | `DateTime?` | 否 | 开始时间 |
| `finished_at` | `DateTime?` | 否 | 结束时间 |
| `created_at` | `DateTime` | 是 | 创建时间 |
| `updated_at` | `DateTime` | 是 | 更新时间 |

### 6.8 AI 调用日志表

`ai_call_logs` 用于排查成本、延迟和失败原因，不直接面向用户展示。

| 字段 | 类型建议 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `id` | `String` | 是 | 主键 |
| `user_id` | `String?` | 否 | 关联用户 |
| `task_id` | `String?` | 否 | 关联任务 |
| `provider` | `String` | 是 | `dashscope`、`lanxin`、`openai_compatible` |
| `model` | `String` | 是 | 模型名 |
| `purpose` | `String` | 是 | `asr`、`interview_review`、`resume_parse` |
| `request_summary` | `Json?` | 否 | 请求摘要，避免存敏感全文 |
| `response_summary` | `Json?` | 否 | 响应摘要 |
| `status` | `String` | 是 | `succeeded`、`failed` |
| `latency_ms` | `Int?` | 否 | 耗时 |
| `prompt_tokens` | `Int?` | 否 | 输入 token |
| `completion_tokens` | `Int?` | 否 | 输出 token |
| `error_message` | `String?` | 否 | 错误详情 |
| `created_at` | `DateTime` | 是 | 创建时间 |

### 6.9 简历、岗位和模拟面试表

第一版不必做得很重，但建议提前留表，方便后续闭环。

`resumes`：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `id` | `String` | 主键 |
| `user_id` | `String` | 用户 ID |
| `file_id` | `String?` | 简历文件 |
| `title` | `String` | 简历标题 |
| `raw_text` | `String?` | 解析文本 |
| `structured_profile` | `Json?` | 结构化简历 |
| `optimization_advice` | `Json?` | 优化建议 |
| `status` | `String` | `uploaded`、`parsed`、`optimized`、`failed` |
| `created_at` / `updated_at` | `DateTime` | 时间字段 |

`job_descriptions`：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `id` | `String` | 主键 |
| `user_id` | `String?` | 用户 ID |
| `company_name` | `String?` | 公司 |
| `position_name` | `String` | 岗位 |
| `raw_text` | `String` | JD 原文 |
| `structured_requirements` | `Json?` | 结构化要求 |
| `source_url` | `String?` | 来源链接 |
| `created_at` / `updated_at` | `DateTime` | 时间字段 |

`job_matches`：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `id` | `String` | 主键 |
| `user_id` | `String` | 用户 ID |
| `resume_id` | `String?` | 简历 ID |
| `job_id` | `String` | JD ID |
| `match_score` | `Int?` | 匹配分 |
| `strengths` | `Json?` | 优势 |
| `gaps` | `Json?` | 差距 |
| `preparation_advice` | `Json?` | 准备建议 |
| `created_at` | `DateTime` | 创建时间 |

`mock_interview_sessions`：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `id` | `String` | 主键 |
| `user_id` | `String` | 用户 ID |
| `job_id` | `String?` | 岗位 ID |
| `resume_id` | `String?` | 简历 ID |
| `type` | `String` | 技术面、HR 面、项目深挖等 |
| `status` | `String` | `running`、`completed`、`cancelled` |
| `summary` | `String?` | 总结 |
| `score` | `Int?` | 总评分 |
| `created_at` / `updated_at` | `DateTime` | 时间字段 |

`mock_interview_messages`：

| 字段 | 类型建议 | 说明 |
| --- | --- | --- |
| `id` | `String` | 主键 |
| `session_id` | `String` | 模拟面试会话 ID |
| `role` | `String` | `interviewer`、`candidate`、`system` |
| `content` | `String` | 消息内容 |
| `feedback` | `Json?` | 针对回答的反馈 |
| `order_no` | `Int` | 顺序 |
| `created_at` | `DateTime` | 创建时间 |

### 6.10 Prisma 关系建议

核心关系：

```txt
User 1 - 1 UserProfile
User 1 - N File
User 1 - N InterviewReview
InterviewReview 1 - N ReviewAudio
InterviewReview 1 - 1 ReviewTranscript
InterviewReview 1 - N ReviewQaPair
InterviewReview 1 - N ReviewInsight
User 1 - N KnowledgeItem
Task N - 1 User
AiCallLog N - 1 Task
```

索引建议：

- `users.email`、`users.phone` 建唯一索引。
- `interview_reviews.user_id + created_at` 建普通索引。
- `knowledge_items.user_id + type + status` 建普通索引。
- `tasks.status + created_at` 建普通索引。
- `files.user_id + biz_type + created_at` 建普通索引。

### 6.11 数据安全和备份

面试录音、简历和复盘内容都属于敏感数据。即使是 Demo，也建议：

- `.env` 不提交 Git。
- `data/*.sqlite3` 不提交 Git。
- `uploads/` 不提交 Git。
- 服务器每天备份 SQLite 文件和必要上传文件。
- 删除用户数据时，不只删业务记录，也要处理相关文件。
- AI 调用日志尽量不要保存完整简历、完整录音转写和完整 Prompt。

## 7. 环境变量建议

`.env.example` 建议按正式 TypeScript 后端整理：

```env
APP_ENV=development
APP_NAME=zhitou-copilot
PORT=8001
API_PREFIX=/api/v1
PUBLIC_API_BASE_URL=https://api.example.com
ALLOW_ORIGINS=*

DATABASE_URL=file:./data/zhitou_copilot.sqlite3

UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=100
STATIC_UPLOAD_URL_PREFIX=/static/uploads

REDIS_URL=redis://127.0.0.1:6379

AI_PROVIDER=dashscope
DASHSCOPE_API_KEY=
DASHSCOPE_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_ASR_MODEL=fun-asr
DASHSCOPE_TEXT_MODEL=qwen-plus

LANXIN_API_BASE_URL=
LANXIN_API_KEY=
LANXIN_TEXT_MODEL=
LANXIN_ASR_MODEL=

AI_TIMEOUT_SECONDS=120
AI_ENABLE_MOCK=true
```

密钥只能放服务器 `.env`，不能写入 Android App，也不要提交到 Git。

## 8. 服务器环境建议

### 8.1 基础安装

服务器推荐安装：

```txt
Ubuntu 22.04 / 24.04
Node.js 20 LTS
pnpm
Nginx
PM2
Redis
SQLite
Git
Certbot
```

### 8.2 端口规划

```txt
80 / 443       -> Nginx 对外
8001           -> NestJS 后端，仅本机或内网访问
6379           -> Redis，仅本机访问
/static/uploads -> Nginx 静态文件映射
```

Nginx 负责：

- HTTPS 证书。
- 反向代理 `/api/` 到 NestJS。
- 暴露 `/static/uploads/` 给 ASR 服务读取音频。
- 限制上传体积。

### 8.3 进程守护

推荐使用 PM2：

```txt
pm2 start dist/main.js --name zhitou-backend
pm2 save
pm2 startup
```

也可以后续改 systemd。Demo 阶段 PM2 更快。

## 9. 开发迁移路线

建议按以下顺序推进，避免同时重写太多东西。

### 阶段 1：搭建 TypeScript 后端骨架

- 初始化 NestJS 工程。
- 配置 `/api/v1/health`。
- 配置统一响应格式。
- 配置 `.env`、Swagger、CORS。
- 配置 Prisma + SQLite。

验收标准：

```txt
GET /api/v1/health 返回统一响应
Swagger 可以访问
Prisma 能创建 SQLite 数据库
```

### 阶段 2：文件上传和静态访问

- 实现音频上传接口。
- 保存文件元数据。
- 配置 Nginx 静态映射。
- 确认公网 URL 可以访问上传后的音频。

验收标准：

```txt
Android / Postman 上传 m4a 成功
浏览器能访问 public_url
FunASR 能读取 public_url
```

### 阶段 3：迁移 ASR 调用

- 用 TypeScript 封装 DashScope FunASR 调用。
- 支持异步任务轮询。
- 保存原始 ASR JSON。
- 生成 speaker transcript。

验收标准：

```txt
给定一段面试录音，后端能生成带 speaker_id 的转写结果
```

### 阶段 4：迁移角色识别和 AI 复盘

- 迁移 speaker_id 到面试官 / 候选人的判断规则。
- 生成 role_transcript。
- 封装文本模型调用。
- 加入 JSON Schema 校验。
- 保存结构化复盘结果。

验收标准：

```txt
同一条录音可生成 review JSON
review JSON 可被前端稳定展示
```

### 阶段 5：知识库联动

- 从复盘 JSON 中生成知识库条目。
- 支持按用户查询知识库。
- 模拟面试模块读取历史短板和高频问题。

验收标准：

```txt
真实面试复盘结果能反向影响下一次模拟面试题目
```

## 10. API 草案

建议沿用现有 `docs/api规范.md` 的统一响应格式，并补充面试复盘相关接口：

```txt
GET    /api/v1/health

POST   /api/v1/reviews/upload-audio
GET    /api/v1/reviews
GET    /api/v1/reviews/{review_id}
POST   /api/v1/reviews/{review_id}/reanalyze

GET    /api/v1/tasks/{task_id}

GET    /api/v1/knowledge/items
POST   /api/v1/knowledge/items
PATCH  /api/v1/knowledge/items/{item_id}
DELETE /api/v1/knowledge/items/{item_id}
```

`POST /api/v1/reviews/upload-audio` 响应示例：

```json
{
  "success": true,
  "data": {
    "review_id": "rev_001",
    "task_id": "task_001",
    "status": "pending"
  },
  "error": null,
  "request_id": "req_001"
}
```

`GET /api/v1/tasks/{task_id}` 响应示例：

```json
{
  "success": true,
  "data": {
    "task_id": "task_001",
    "type": "interview_review_asr",
    "status": "running",
    "progress": 60
  },
  "error": null,
  "request_id": "req_002"
}
```

## 11. 本机开发、Git 提交与服务器同步更新流程

### 11.1 你想实现的流程

你描述的目标是：

```txt
本机开发一个需求
  -> 本机测试通过
  -> git commit
  -> git push 到远程仓库
  -> 服务器自动拉取最新代码
  -> 安装依赖 / 数据库迁移 / 构建
  -> 重启后端服务
  -> 新需求在线上生效
```

这个方向本质上就是 CI/CD。它符合现代开发思想，但要注意：企业里通常不会让“任何一次 push 直接更新生产服务器”。更常见的是：

```txt
feature 分支开发
  -> Pull Request / Merge Request
  -> 自动测试和代码检查
  -> 合并到 main / develop
  -> 部署到测试环境
  -> 验收通过
  -> 手动或自动发布到生产环境
```

对于复赛 Demo，可以先做轻量版自动部署。等项目稳定后，再升级成企业式 CI/CD。

### 11.2 推荐分支规范

Demo 阶段建议简单一些：

```txt
main       -> 稳定分支，服务器只部署 main
feature/* -> 本机开发新功能
fix/*     -> 修 bug
```

开发流程：

```txt
git checkout -b feature/interview-review-asr
本机开发和测试
git add .
git commit -m "feat: add interview review asr pipeline"
git push origin feature/interview-review-asr
创建 Pull Request
合并到 main
服务器部署 main
```

如果团队人数少、时间紧，也可以先直接 push 到 main，但服务器自动部署前必须至少跑：

```txt
pnpm install
pnpm lint
pnpm test
pnpm build
prisma migrate deploy
```

### 11.3 Demo 阶段可用方案：GitHub Actions SSH 自动部署

如果远程仓库在 GitHub，推荐使用 GitHub Actions。服务器不需要主动监听仓库，GitHub 在 `main` 更新后通过 SSH 登录服务器执行部署命令。

整体流程：

```txt
开发者 push main
  -> GitHub Actions 触发
  -> SSH 登录服务器
  -> cd /srv/CareerInvestmentCopilot
  -> git pull origin main
  -> pnpm install --frozen-lockfile
  -> pnpm prisma migrate deploy
  -> pnpm build
  -> pm2 restart zhitou-backend
```

服务器目录建议：

```txt
/srv/CareerInvestmentCopilot
  apps/backend
  docs
  samples
```

PM2 运行目录建议是：

```txt
/srv/CareerInvestmentCopilot/apps/backend
```

GitHub Actions 示例：

```yaml
name: Deploy Backend

on:
  push:
    branches:
      - main
    paths:
      - "apps/backend/**"
      - ".github/workflows/deploy-backend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy by SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /srv/CareerInvestmentCopilot
            git pull origin main
            cd apps/backend
            pnpm install --frozen-lockfile
            pnpm prisma migrate deploy
            pnpm build
            pm2 restart zhitou-backend || pm2 start dist/main.js --name zhitou-backend
            pm2 save
```

需要在 GitHub 仓库中配置 Secrets：

```txt
SERVER_HOST      服务器公网 IP 或域名
SERVER_USER      SSH 用户名
SERVER_SSH_KEY   部署私钥
```

注意：

- 服务器上的 `.env` 不由 GitHub Actions 覆盖，手动放在服务器。
- `uploads/`、`data/`、`.env` 不要提交 Git。
- 部署用户只给项目目录和 PM2 所需权限，不建议长期使用 root。

### 11.4 服务器侧准备步骤

第一次部署需要手动准备服务器：

```txt
1. 安装 Node.js 20、pnpm、Git、Nginx、PM2、Redis。
2. 在 /srv 下 clone 仓库。
3. 在 apps/backend 创建 .env。
4. pnpm install。
5. pnpm prisma migrate deploy。
6. pnpm build。
7. pm2 start dist/main.js --name zhitou-backend。
8. 配置 Nginx 反向代理。
9. 配置 HTTPS。
```

之后日常更新才交给 GitHub Actions。

### 11.5 更简单但不太企业化的方案：服务器定时 git pull

也可以让服务器每隔一分钟执行：

```txt
git pull origin main
pnpm build
pm2 restart
```

这个方案不推荐，原因：

- 服务器不知道这次提交是否测试通过。
- 构建失败时可能留下半更新状态。
- 难以记录是谁触发的部署。
- 多人协作时容易把未验收代码直接发到服务器。

如果只是比赛前个人 Demo，短期可以用。但只要开始多人协作，就建议改 GitHub Actions 或 GitLab CI。

### 11.6 企业中更规范的做法

企业常见流程通常是：

```txt
本机开发
  -> feature 分支
  -> Pull Request
  -> CI 自动执行 lint / test / build
  -> Code Review
  -> 合并 main
  -> 自动部署测试环境
  -> 产品 / 测试验收
  -> 打 tag 或手动审批
  -> 部署生产环境
```

更成熟的团队还会加入：

- Docker 镜像构建。
- 镜像版本号和 Git commit 绑定。
- 数据库迁移审查。
- 灰度发布和回滚。
- 日志、监控、告警。
- staging 和 production 两套环境变量。

复赛 Demo 不需要一步到位做到这么重，但建议保留这个方向。

### 11.7 本项目推荐落地方式

本项目当前阶段建议：

```txt
第一阶段：本机开发 + 手动 SSH 部署
第二阶段：GitHub Actions + SSH 自动部署 main 到服务器
第三阶段：增加测试环境、PR 检查、生产发布手动审批
第四阶段：Docker 化部署
```

最推荐的短期方案：

```txt
本机 feature 分支开发
  -> 合并 main
  -> GitHub Actions 自动部署到演示服务器
```

这样既能满足“提交后服务器同步更新”的效率，又不会完全脱离企业开发规范。

### 11.8 数据库迁移注意事项

使用 Prisma 后，数据库结构变更不要手动改 SQLite 文件，而要走迁移：

本机开发时：

```txt
pnpm prisma migrate dev --name add_interview_review_tables
```

提交代码时要提交：

```txt
prisma/schema.prisma
prisma/migrations/*
```

服务器部署时执行：

```txt
pnpm prisma migrate deploy
```

注意：

- 不要在服务器上执行 `prisma migrate dev`。
- 生产或演示服务器只执行 `migrate deploy`。
- 迁移前备份 `data/zhitou_copilot.sqlite3`。
- 删除字段、重命名字段、清空表这类变更要格外谨慎。

## 12. 关键风险和建议

### 12.1 不建议同步处理长音频

ASR 和复盘分析可能耗时几十秒到数分钟。后端接口应尽快返回 `task_id`，由 worker 异步处理。

### 12.2 不建议把 API Key 放进 Android

所有模型 Key 必须放后端服务器。Android 只调用自己的业务接口。

### 12.3 不建议让 ASR 直接依赖本地路径

正式流程必须统一成公网 URL 或对象存储临时签名 URL。Windows 本地路径只适合脚本测试。

### 12.4 不建议前期过度设计用户系统

复赛 Demo 可以先使用单用户或简单用户表，把主要精力放在面试复盘闭环。权限体系、团队空间、复杂登录可以后置。

### 12.5 要保留人工修正入口

ASR 和角色识别都会出错。面试复盘结果页应允许用户修正角色、文本、问题标签，并支持重新分析。

### 12.6 不建议每次 push 都直接更新生产环境

自动部署很有用，但必须有分支、测试、构建和回滚意识。Demo 服务器可以自动部署 `main`，真正生产环境应增加人工审批或 tag 发布。

## 13. 最终建议

如果团队已经决定后端使用 TypeScript，推荐采用：

```txt
NestJS + Prisma + SQLite + BullMQ + Redis + Nginx + PM2
```

当前 Python ASR demo 不应继续扩展成正式接口，而应作为迁移样例保留。正式后端优先搭建 NestJS 工程，然后按“文件上传 -> 公网音频 URL -> ASR 异步任务 -> 角色识别 -> AI 复盘 JSON -> 知识库沉淀”的顺序实现。

第一版目标不需要追求复杂架构，重点是让 Android App 能稳定完成：

```txt
上传真实面试录音
  -> 查询处理进度
  -> 查看结构化复盘
  -> 保存为个人知识库
  -> 反向用于下一次模拟面试
```

这条链路一旦稳定，职投 Copilot 的核心产品闭环就成立了。
