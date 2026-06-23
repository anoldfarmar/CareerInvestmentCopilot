# zpq 数据库对照表

本文用于本次 `merge/zpq-server-work` 与 `merge/ps-local-work` 合并时，对齐双方数据库表名、字段名、外键关系和接口含义。

当前仓库可确认的 zpq 侧数据库来源：

```text
后端目录：ai-job-backend
Prisma schema：ai-job-backend/prisma/schema.prisma
Migration 目录：ai-job-backend/prisma/migrations/
```

注意：当前 zpq 侧代码中可确认的主表是 Prisma 默认表名体系，例如 `"User"`、`"Resume"`、`"Job"`。部分旧文档中提到 `users`、`resumes`、`job_descriptions` 等蛇形表，这是另一套目标或旧库命名，合并时必须人工确认最终采用哪一套。

## 一、合并结论记录区

| 项目 | 当前结论 |
| --- | --- |
| 最终用户主表 | 待定 |
| 最终简历主表 | 待定 |
| 最终岗位/JD 主表 | 待定 |
| 最终投递管理主表 | 待定 |
| 最终面试记录主表 | 待定 |
| 最终知识库主表 | 待定 |
| 最终命名风格 | 待定：Prisma 驼峰表名 / PostgreSQL 蛇形表名 |
| 是否需要数据迁移 | 待定 |
| 是否允许删旧表 | 默认不允许，确认备份后再处理 |

## 二、业务表名对照总表

| 业务含义 | zpq 当前表/模型 | ps 当前表/模型 | 最终采用表/模型 | 处理方式 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 用户账号 | `"User"` / `User` | 待补充 | 待定 | 待定 | 登录、用户外键来源 |
| 用户画像 | `"UserProfile"` / `UserProfile` | 待补充 | 待定 | 待定 | 用户设置、目标方向、偏好 |
| 简历主表 | `"Resume"` / `Resume` | 待补充 | 待定 | 待定 | 简历原文、结构化、优化稿、定稿 |
| 简历版本 | `"ResumeVersion"` / `ResumeVersion` | 待补充 | 待定 | 待定 | 每次保存、定稿的历史版本 |
| 简历导出 | `"ResumeExport"` / `ResumeExport` | 待补充 | 待定 | 待定 | PDF 导出记录 |
| 岗位/JD | `"Job"` / `Job` | 待补充 | 待定 | 待定 | 岗位、JD、投递状态当前都在该表 |
| 面试知识库 | `"InterviewKnowledgeBase"` / `InterviewKnowledgeBase` | 待补充 | 待定 | 待定 | 面试复盘资料分组 |
| 真实面试记录 | `"RealInterviewRecord"` / `RealInterviewRecord` | 待补充 | 待定 | 待定 | 音频、ASR、转写、结构化内容 |
| 模拟面试会话 | `"InterviewSession"` / `InterviewSession` | 待补充 | 待定 | 待定 | 模拟面试问题、消息、反馈 |
| 面试复盘报告 | `"ReviewReport"` / `ReviewReport` | 待补充 | 待定 | 待定 | 面试评分、维度、行动建议 |
| 每日活动统计 | `"DailyActivity"` / `DailyActivity` | 待补充 | 待定 | 待定 | 投递数、音频上传数、模拟面试数 |

处理方式建议只填以下几种：

```text
保留 zpq
保留 ps
合并字段
重命名迁移
废弃但暂不删除
```

## 三、用户模块字段对照

### 3.1 用户账号

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 用户 ID | `"User"."id"` | 待补充 | 待定 | 是 | zpq 当前为 `Int autoincrement` |
| 邮箱 | `"User"."email"` | 待补充 | 待定 | 是 | zpq 当前唯一 |
| 用户名 | `"User"."name"` | 待补充 | 待定 | 否 | 允许为空 |
| 密码哈希 | `"User"."passwordHash"` | 待补充 | 待定 | 否 | 不保存明文密码 |
| 创建时间 | `"User"."createdAt"` | 待补充 | 待定 | 是 | 默认当前时间 |
| 更新时间 | `"User"."updatedAt"` | 待补充 | 待定 | 是 | 自动更新时间 |

### 3.2 用户画像

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 画像 ID | `"UserProfile"."id"` | 待补充 | 待定 | 是 | zpq 当前为 `Int autoincrement` |
| 用户 ID | `"UserProfile"."userId"` | 待补充 | 待定 | 是 | 关联 `"User"."id"`，唯一 |
| 姓名 | `"UserProfile"."name"` | 待补充 | 待定 | 否 | 和 `"User"."name"` 是否重复需确认 |
| 求职模式 | `"UserProfile"."jobMode"` | 待补充 | 待定 | 是 | 默认 `experienced` |
| 目标方向 | `"UserProfile"."targetDirection"` | 待补充 | 待定 | 是 | 默认 `tech` |
| 多目标方向 | `"UserProfile"."targetDirections"` | 待补充 | 待定 | 否 | JSON |
| 自定义方向 | `"UserProfile"."customTargetDirection"` | 待补充 | 待定 | 否 | 文本 |
| 订阅计划 | `"UserProfile"."subscriptionPlan"` | 待补充 | 待定 | 是 | 默认 `free` |
| 语言 | `"UserProfile"."language"` | 待补充 | 待定 | 是 | 默认 `zh-CN` |
| 问题数量 | `"UserProfile"."questionCount"` | 待补充 | 待定 | 是 | 默认 `5` |
| 启用语音输入 | `"UserProfile"."enableVoiceInput"` | 待补充 | 待定 | 是 | 默认 `true` |
| 显示 STAR 提示 | `"UserProfile"."showStarTips"` | 待补充 | 待定 | 是 | 默认 `true` |

## 四、简历模块字段对照

### 4.1 简历主表

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 简历 ID | `"Resume"."id"` | 待补充 | 待定 | 是 | zpq 当前为 `Int autoincrement` |
| 用户 ID | `"Resume"."userId"` | 待补充 | 待定 | 是 | 关联 `"User"."id"` |
| 标题 | `"Resume"."title"` | 待补充 | 待定 | 是 | 简历名称 |
| 原始文本 | `"Resume"."originalContent"` | 待补充 | 待定 | 是 | 默认空字符串 |
| 原始文件名 | `"Resume"."originalFileName"` | 待补充 | 待定 | 否 | 上传文件元数据 |
| 原始文件路径 | `"Resume"."originalFilePath"` | 待补充 | 待定 | 否 | 本地或对象存储路径 |
| 原始文件 URL | `"Resume"."originalFileUrl"` | 待补充 | 待定 | 否 | 可访问 URL |
| 文件 MIME | `"Resume"."originalFileMime"` | 待补充 | 待定 | 否 | 文件类型 |
| 文件大小 | `"Resume"."originalFileSize"` | 待补充 | 待定 | 否 | 字节数 |
| 结构化内容 | `"Resume"."structuredContent"` | 待补充 | 待定 | 否 | JSON |
| 优化内容 | `"Resume"."optimizedContent"` | 待补充 | 待定 | 否 | JSON |
| 草稿内容 | `"Resume"."draftContent"` | 待补充 | 待定 | 否 | JSON |
| 定稿内容 | `"Resume"."finalizedContent"` | 待补充 | 待定 | 否 | JSON |
| 定稿时间 | `"Resume"."finalizedAt"` | 待补充 | 待定 | 否 | 时间 |
| 优化版本号 | `"Resume"."optimizationVersion"` | 待补充 | 待定 | 是 | 默认 `0` |
| MinerU 任务 ID | `"Resume"."mineruTaskId"` | 待补充 | 待定 | 否 | zpq 当前唯一 |
| 解析状态 | `"Resume"."parseStatus"` | 待补充 | 待定 | 是 | 默认 `not_started` |
| 结构化状态 | `"Resume"."structureStatus"` | 待补充 | 待定 | 是 | 默认 `idle` |
| 优化状态 | `"Resume"."optimizeStatus"` | 待补充 | 待定 | 是 | 默认 `idle` |

### 4.2 简历版本与导出

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 版本记录 | `"ResumeVersion"` | 待补充 | 待定 | 否 | 保存/定稿历史 |
| 导出记录 | `"ResumeExport"` | 待补充 | 待定 | 否 | PDF 导出历史 |
| 版本内容 | `"ResumeVersion"."content"` | 待补充 | 待定 | 是 | JSON |
| 导出文件路径 | `"ResumeExport"."filePath"` | 待补充 | 待定 | 是 | 本地文件路径 |
| S3 URL | `"ResumeExport"."s3Url"` | 待补充 | 待定 | 否 | 对象存储 URL |

## 五、岗位与投递管理字段对照

zpq 当前把“岗位/JD”和“投递管理看板”放在同一张 `"Job"` 表中。

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 岗位 ID | `"Job"."id"` | 待补充 | 待定 | 是 | zpq 当前为 `Int autoincrement` |
| 用户 ID | `"Job"."userId"` | 待补充 | 待定 | 是 | 关联 `"User"."id"` |
| 岗位名称 | `"Job"."title"` | 待补充 | 待定 | 是 | 职位名称 |
| 公司名称 | `"Job"."company"` | 待补充 | 待定 | 否 | 公司 |
| JD 原文 | `"Job"."description"` | 待补充 | 待定 | 是 | 长文本 |
| 来源链接 | `"Job"."sourceUrl"` | 待补充 | 待定 | 否 | 招聘链接 |
| 薪资 | `"Job"."salary"` | 待补充 | 待定 | 否 | 投递管理新增字段 |
| 地点 | `"Job"."location"` | 待补充 | 待定 | 否 | 投递管理新增字段 |
| 备注 | `"Job"."notes"` | 待补充 | 待定 | 否 | 投递管理新增字段 |
| 优先级 | `"Job"."priority"` | 待补充 | 待定 | 是 | 默认 `normal` |
| 投递状态 | `"Job"."status"` | 待补充 | 待定 | 是 | 默认 `draft` |
| 创建时间 | `"Job"."createdAt"` | 待补充 | 待定 | 是 | 默认当前时间 |
| 更新时间 | `"Job"."updatedAt"` | 待补充 | 待定 | 是 | 自动更新时间 |

zpq 当前约定的 `"Job"."status"` 值：

```text
draft
interested
applied
interviewing
offer
rejected
archived
```

如果 ps 侧把投递管理拆成了子表，例如 `applications`、`delivery_records`、`job_applications`，需要重点确认：

```text
1. 一条 JD 是否可以有多次投递记录
2. 投递状态是岗位状态，还是单次投递状态
3. 面试安排、待办事项是否应该单独成表
4. 投递记录是否需要关联简历版本
```

## 六、面试与知识库字段对照

### 6.1 面试知识库

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 知识库 ID | `"InterviewKnowledgeBase"."id"` | 待补充 | 待定 | 是 | zpq 当前为 `String cuid` |
| 用户 ID | `"InterviewKnowledgeBase"."userId"` | 待补充 | 待定 | 是 | 关联 `"User"."id"` |
| 名称 | `"InterviewKnowledgeBase"."name"` | 待补充 | 待定 | 是 | 知识库名称 |
| 描述 | `"InterviewKnowledgeBase"."description"` | 待补充 | 待定 | 否 | 文本 |
| 关注领域 | `"InterviewKnowledgeBase"."focusAreas"` | 待补充 | 待定 | 否 | JSON |

### 6.2 真实面试记录

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 记录 ID | `"RealInterviewRecord"."id"` | 待补充 | 待定 | 是 | zpq 当前为 `String cuid` |
| 知识库 ID | `"RealInterviewRecord"."knowledgeBaseId"` | 待补充 | 待定 | 是 | 关联 `"InterviewKnowledgeBase"."id"` |
| 标题 | `"RealInterviewRecord"."title"` | 待补充 | 待定 | 是 | 面试记录标题 |
| 来源类型 | `"RealInterviewRecord"."sourceType"` | 待补充 | 待定 | 是 | 手动、音频等 |
| 面试日期 | `"RealInterviewRecord"."interviewDate"` | 待补充 | 待定 | 是 | 时间 |
| 转写文本 | `"RealInterviewRecord"."transcript"` | 待补充 | 待定 | 否 | ASR 或手动文本 |
| 音频文件名 | `"RealInterviewRecord"."audioFileName"` | 待补充 | 待定 | 否 | 音频元数据 |
| 音频大小 | `"RealInterviewRecord"."audioFileSize"` | 待补充 | 待定 | 否 | 字节数 |
| 音频 URL | `"RealInterviewRecord"."audioUrl"` | 待补充 | 待定 | 否 | 可访问 URL |
| ASR 服务商 | `"RealInterviewRecord"."asrProvider"` | 待补充 | 待定 | 否 | 例如实时 ASR |
| ASR 模型 | `"RealInterviewRecord"."asrModel"` | 待补充 | 待定 | 否 | 模型名称 |
| ASR 原始 JSON | `"RealInterviewRecord"."asrRawJson"` | 待补充 | 待定 | 否 | JSON |
| 说话人转写 | `"RealInterviewRecord"."speakerTranscript"` | 待补充 | 待定 | 否 | 文本 |
| 角色转写 | `"RealInterviewRecord"."roleTranscript"` | 待补充 | 待定 | 否 | 文本 |
| 转写时间 | `"RealInterviewRecord"."transcribedAt"` | 待补充 | 待定 | 否 | 时间 |
| 记录状态 | `"RealInterviewRecord"."status"` | 待补充 | 待定 | 是 | 默认 `ready` |
| 构建状态 | `"RealInterviewRecord"."buildStatus"` | 待补充 | 待定 | 是 | 默认 `not_built` |
| 构建错误 | `"RealInterviewRecord"."buildError"` | 待补充 | 待定 | 否 | 文本 |
| 结构化内容 | `"RealInterviewRecord"."structuredContent"` | 待补充 | 待定 | 否 | JSON |
| 分块内容 | `"RealInterviewRecord"."chunks"` | 待补充 | 待定 | 否 | JSON |

### 6.3 模拟面试与复盘报告

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 模拟面试会话 | `"InterviewSession"` | 待补充 | 待定 | 是 | 问题、消息、反馈 |
| 复盘报告 | `"ReviewReport"` | 待补充 | 待定 | 否 | 评分、维度、建议 |
| 会话用户 ID | `"InterviewSession"."userId"` | 待补充 | 待定 | 是 | 关联 `"User"."id"` |
| 会话简历 ID | `"InterviewSession"."resumeId"` | 待补充 | 待定 | 否 | 关联 `"Resume"."id"` |
| 报告会话 ID | `"ReviewReport"."sessionId"` | 待补充 | 待定 | 否 | 唯一关联会话 |

## 七、活动统计字段对照

| 业务含义 | zpq 表/字段 | ps 表/字段 | 最终字段 | 是否必填 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 活动记录 ID | `"DailyActivity"."id"` | 待补充 | 待定 | 是 | zpq 当前为 `Int autoincrement` |
| 用户 ID | `"DailyActivity"."userId"` | 待补充 | 待定 | 是 | 关联 `"User"."id"` |
| 日期 | `"DailyActivity"."date"` | 待补充 | 待定 | 是 | `Date`，按用户和日期唯一 |
| 投递数量 | `"DailyActivity"."applicationCount"` | 待补充 | 待定 | 是 | 默认 `0` |
| 音频上传数量 | `"DailyActivity"."audioUploadCount"` | 待补充 | 待定 | 是 | 默认 `0` |
| 模拟面试数量 | `"DailyActivity"."mockInterviewCount"` | 待补充 | 待定 | 是 | 默认 `0` |

## 八、需要 ps 补充的信息

ps 需要补充以下内容后，才能判断是否需要迁移或重命名：

```text
1. ps 本机数据库中所有业务表名
2. 每张表的字段名、字段类型、是否可空
3. 主键类型：Int 自增 / cuid 字符串 / uuid
4. 外键关系：谁关联用户、简历、岗位、投递记录
5. 枚举值：投递状态、面试状态、任务状态
6. 是否已有真实测试数据需要保留
7. 哪些功能依赖这些表
```

建议 ps 导出表结构，不导出真实数据：

```bash
pg_dump --schema-only --no-owner --no-privileges -d 数据库名 > ps-schema.sql
```

如果使用 Prisma，也可以提供：

```text
prisma/schema.prisma
prisma/migrations/
```

## 九、冲突判断规则

### 9.1 只是表名不同

如果业务含义完全一致，只是命名不同，例如：

```text
zpq: "Job"
ps: job_applications
```

需要决定最终表名，然后写迁移：

```sql
ALTER TABLE old_table_name RENAME TO final_table_name;
```

如果 Prisma 模型也要改名，需要同步修改：

```text
schema.prisma
service 层 prisma.xxx 调用
controller / dto 字段
前端接口字段
migration
```

### 9.2 表结构拆分不同

如果 zpq 用一张 `"Job"` 表保存岗位和投递状态，而 ps 拆成：

```text
jobs
applications
application_todos
```

这不是简单重命名，需要先决定业务模型：

```text
1. Job/JD 是否是岗位库
2. Application 是否是一次投递
3. Todo 是否属于投递记录
4. Interview 是否属于投递记录还是独立面试模块
```

决定后再做数据迁移，不能直接删除任何一边的表。

### 9.3 字段名不同

如果字段含义一致，只是命名不同，例如：

```text
zpq: company
ps: company_name
```

需要决定最终字段名，然后迁移数据：

```sql
ALTER TABLE "Job" RENAME COLUMN "company" TO "company_name";
```

如果最终保留 Prisma 驼峰字段，则不要直接照搬蛇形字段名，应先确认 Prisma 命名规范。

### 9.4 枚举值不同

如果投递状态含义一致但值不同，例如：

```text
zpq: applied
ps: delivered
```

需要制定状态映射：

| zpq 状态 | ps 状态 | 最终状态 |
| --- | --- | --- |
| `draft` | 待补充 | 待定 |
| `interested` | 待补充 | 待定 |
| `applied` | 待补充 | 待定 |
| `interviewing` | 待补充 | 待定 |
| `offer` | 待补充 | 待定 |
| `rejected` | 待补充 | 待定 |
| `archived` | 待补充 | 待定 |

## 十、最终合并前确认清单

合并数据库相关代码前，需要逐项确认：

```text
1. 最终采用哪套用户表
2. 用户 ID 类型是否统一
3. 简历、岗位、面试、知识库是否都指向同一套用户 ID
4. 投递管理是继续放在 Job 表，还是拆成独立投递表
5. 所有新增字段是否有 migration
6. 所有旧数据是否有迁移 SQL
7. 前端接口字段是否和最终后端 DTO 一致
8. .env.example 是否包含新增数据库配置
9. 合并后是否能从空库完整 migrate
10. 合并后是否能从已有库无损迁移
```

本表填完后，再开始处理数据库 migration 和后端 service 合并。
