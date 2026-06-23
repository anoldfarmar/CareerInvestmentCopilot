# ps 数据库对照表

本文用于记录当前 `merge/ps-local-work` 分支中 PS 侧数据库结构，方便后续与 `zpq` 分支或服务器数据库做表结构合并、字段迁移和接口字段核对。

当前可确认的 PS 侧数据库来源：

```text
后端目录：ai-job-backend
Prisma schema：ai-job-backend/prisma/schema.prisma
Migration 目录：ai-job-backend/prisma/migrations/
数据库类型：PostgreSQL
ORM：Prisma
```

注意：当前 Prisma 未使用 `@@map` 或 `@map`，因此 PostgreSQL 实际表名默认与 Prisma 模型名一致，例如 `"User"`、`"Resume"`、`"Job"`。表名区分大小写，SQL 中建议使用双引号。

## 一、合并结论记录区

| 项目 | 当前结论 |
| --- | --- |
| 最终用户主表 | 当前 PS 使用 `"User"` / `User` |
| 最终用户画像主表 | 当前 PS 使用 `"UserProfile"` / `UserProfile` |
| 最终简历主表 | 当前 PS 使用 `"Resume"` / `Resume` |
| 最终岗位/JD/投递主表 | 当前 PS 使用 `"Job"` / `Job`，岗位、JD、投递状态暂放在同一张表 |
| 最终面试知识库主表 | 当前 PS 使用 `"InterviewKnowledgeBase"` / `InterviewKnowledgeBase` |
| 最终真实面试记录主表 | 当前 PS 使用 `"RealInterviewRecord"` / `RealInterviewRecord` |
| 最终模拟面试会话主表 | 当前 PS 使用 `"InterviewSession"` / `InterviewSession` |
| 最终面试复盘报告主表 | 当前 PS 使用 `"ReviewReport"` / `ReviewReport` |
| 最终活动统计主表 | 当前 PS 使用 `"DailyActivity"` / `DailyActivity` |
| 最终命名风格 | Prisma 驼峰模型名和字段名，PostgreSQL 中使用双引号 |
| 是否需要数据迁移 | 待与目标库实际结构确认 |
| 是否允许删除旧表 | 默认不允许，确认备份和迁移 SQL 后再处理 |

## 二、业务表总览

| 业务含义 | PS 当前表/模型 | 主键类型 | 主要关联 | 备注 |
| --- | --- | --- | --- | --- |
| 用户账号 | `"User"` / `User` | `Int autoincrement` | 被多数业务表通过 `userId` 关联 | 登录账号、邮箱、密码哈希 |
| 用户画像 | `"UserProfile"` / `UserProfile` | `Int autoincrement` | `userId` 唯一关联 `"User"."id"` | 求职模式、目标方向、面试设置 |
| 简历主表 | `"Resume"` / `Resume` | `Int autoincrement` | `userId` 关联用户 | 原始简历、文件信息、结构化/优化/定稿内容 |
| 简历版本 | `"ResumeVersion"` / `ResumeVersion` | `Int autoincrement` | `resumeId` 关联简历 | 简历保存和定稿历史版本 |
| 简历导出 | `"ResumeExport"` / `ResumeExport` | `Int autoincrement` | `resumeId`、`versionId` | PDF 导出记录 |
| 岗位/JD/投递 | `"Job"` / `Job` | `Int autoincrement` | `userId` 关联用户 | 当前同时承载岗位、JD、投递状态 |
| 每日活动统计 | `"DailyActivity"` / `DailyActivity` | `Int autoincrement` | `userId` 关联用户 | 投递数、音频上传数、模拟面试数 |
| 面试知识库 | `"InterviewKnowledgeBase"` / `InterviewKnowledgeBase` | `String cuid` | `userId` 关联用户 | 真实面试资料分组 |
| 真实面试记录 | `"RealInterviewRecord"` / `RealInterviewRecord` | `String cuid` | `knowledgeBaseId` 关联知识库 | 手动记录、音频、ASR、结构化内容 |
| 模拟面试会话 | `"InterviewSession"` / `InterviewSession` | `String cuid` | `userId`、可选 `resumeId` | 问题、消息、反馈、策略快照 |
| 面试复盘报告 | `"ReviewReport"` / `ReviewReport` | `String cuid` | `userId`、可选唯一 `sessionId` | AI/本地生成的复盘评分和建议 |

## 三、用户模块字段对照

### 3.1 用户账号 `"User"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 用户 ID | `"User"."id"` | `Int` | 是 | 自增主键 | 所有业务外键的用户来源 |
| 邮箱 | `"User"."email"` | `String` | 是 | 唯一 | 登录账号 |
| 用户名 | `"User"."name"` | `String?` | 否 | 无 | 可与画像姓名同步，但当前无强约束 |
| 密码哈希 | `"User"."passwordHash"` | `String?` | 否 | 无 | 不保存明文密码 |
| 创建时间 | `"User"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"User"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

### 3.2 用户画像 `"UserProfile"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 画像 ID | `"UserProfile"."id"` | `Int` | 是 | 自增主键 | 画像记录主键 |
| 姓名 | `"UserProfile"."name"` | `String?` | 否 | 无 | 页面展示姓名 |
| 求职模式 | `"UserProfile"."jobMode"` | `String` | 是 | `experienced` | 例如校招/社招等模式 |
| 目标方向 | `"UserProfile"."targetDirection"` | `String` | 是 | `tech` | 单一主方向 |
| 多目标方向 | `"UserProfile"."targetDirections"` | `Json?` | 否 | 无 | 前端多选方向 |
| 自定义方向 | `"UserProfile"."customTargetDirection"` | `String?` | 否 | 无 | 用户自定义文本 |
| 订阅计划 | `"UserProfile"."subscriptionPlan"` | `String` | 是 | `free` | 当前为字符串 |
| 语言 | `"UserProfile"."language"` | `String` | 是 | `zh-CN` | 面试/界面偏好 |
| 问题数量 | `"UserProfile"."questionCount"` | `Int` | 是 | `5` | 模拟面试题数 |
| 启用语音输入 | `"UserProfile"."enableVoiceInput"` | `Boolean` | 是 | `true` | 面试设置 |
| 显示 STAR 提示 | `"UserProfile"."showStarTips"` | `Boolean` | 是 | `true` | 面试设置 |
| 用户 ID | `"UserProfile"."userId"` | `Int` | 是 | 唯一外键 | 关联 `"User"."id"`，删除用户时级联删除 |
| 创建时间 | `"UserProfile"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"UserProfile"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

## 四、简历模块字段对照

### 4.1 简历主表 `"Resume"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 简历 ID | `"Resume"."id"` | `Int` | 是 | 自增主键 | 简历主键 |
| 标题 | `"Resume"."title"` | `String` | 是 | 无 | 简历名称 |
| 原始文本 | `"Resume"."originalContent"` | `String @db.Text` | 是 | 空字符串 | 上传/粘贴的原文 |
| 原始文件名 | `"Resume"."originalFileName"` | `String?` | 否 | 无 | 文件元数据 |
| 原始文件路径 | `"Resume"."originalFilePath"` | `String? @db.Text` | 否 | 无 | 本地或对象存储路径 |
| 原始文件 URL | `"Resume"."originalFileUrl"` | `String? @db.Text` | 否 | 无 | 前端可访问 URL |
| 文件 MIME | `"Resume"."originalFileMime"` | `String?` | 否 | 无 | 文件类型 |
| 文件大小 | `"Resume"."originalFileSize"` | `Int?` | 否 | 无 | 字节数 |
| 结构化内容 | `"Resume"."structuredContent"` | `Json?` | 否 | 无 | AI 解析结果 |
| 优化内容 | `"Resume"."optimizedContent"` | `Json?` | 否 | 无 | AI 优化结果 |
| 草稿内容 | `"Resume"."draftContent"` | `Json?` | 否 | 无 | 编辑草稿 |
| 定稿内容 | `"Resume"."finalizedContent"` | `Json?` | 否 | 无 | 最终简历 |
| JD 匹配结果 | `"Resume"."jdMatchResult"` | `Json?` | 否 | 无 | 岗位匹配分析缓存 |
| 定稿时间 | `"Resume"."finalizedAt"` | `DateTime?` | 否 | 无 | 简历定稿时间 |
| 优化版本号 | `"Resume"."optimizationVersion"` | `Int` | 是 | `0` | 优化递增版本 |
| MinerU 任务 ID | `"Resume"."mineruTaskId"` | `String?` | 否 | 唯一 | 文档解析任务 |
| 解析状态 | `"Resume"."parseStatus"` | `String` | 是 | `not_started` | 文件解析状态 |
| 结构化状态 | `"Resume"."structureStatus"` | `String` | 是 | `idle` | 结构化任务状态 |
| 优化状态 | `"Resume"."optimizeStatus"` | `String` | 是 | `idle` | 优化任务状态 |
| 用户 ID | `"Resume"."userId"` | `Int` | 是 | 外键 | 关联 `"User"."id"`，删除用户时级联删除 |
| 创建时间 | `"Resume"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"Resume"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

索引：

```text
@@index([userId, createdAt])
@@index([userId, updatedAt])
@@index([parseStatus])
@@index([finalizedAt])
```

### 4.2 简历版本 `"ResumeVersion"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 版本 ID | `"ResumeVersion"."id"` | `Int` | 是 | 自增主键 | 版本主键 |
| 简历 ID | `"ResumeVersion"."resumeId"` | `Int` | 是 | 外键 | 关联 `"Resume"."id"`，删除简历时级联删除 |
| 版本号 | `"ResumeVersion"."version"` | `Int` | 是 | 与 `resumeId` 联合唯一 | 同一简历内递增 |
| 标签 | `"ResumeVersion"."label"` | `String` | 是 | 无 | 版本名称 |
| 来源 | `"ResumeVersion"."source"` | `String` | 是 | 无 | 保存来源 |
| 内容 | `"ResumeVersion"."content"` | `Json` | 是 | 无 | 版本内容 |
| 备注 | `"ResumeVersion"."notes"` | `Json?` | 否 | 无 | 额外说明 |
| 是否最终版 | `"ResumeVersion"."isFinal"` | `Boolean` | 是 | `false` | 定稿标记 |
| 创建时间 | `"ResumeVersion"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |

约束和索引：

```text
@@unique([resumeId, version])
@@index([resumeId, createdAt])
@@index([resumeId, isFinal])
```

### 4.3 简历导出 `"ResumeExport"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 导出 ID | `"ResumeExport"."id"` | `Int` | 是 | 自增主键 | 导出记录主键 |
| 简历 ID | `"ResumeExport"."resumeId"` | `Int` | 是 | 外键 | 关联 `"Resume"."id"`，删除简历时级联删除 |
| 版本 ID | `"ResumeExport"."versionId"` | `Int?` | 否 | 外键 | 关联 `"ResumeVersion"."id"`，删除版本时置空 |
| 版本号 | `"ResumeExport"."versionNumber"` | `Int` | 是 | 联合唯一字段之一 | 导出版本 |
| 模板 | `"ResumeExport"."template"` | `String` | 是 | 联合唯一字段之一 | PDF 模板名 |
| 文件路径 | `"ResumeExport"."filePath"` | `String` | 是 | 无 | 本地文件路径 |
| S3 URL | `"ResumeExport"."s3Url"` | `String?` | 否 | 无 | 对象存储 URL |
| 下载次数 | `"ResumeExport"."downloadCount"` | `Int` | 是 | `0` | 下载统计 |
| 是否过期 | `"ResumeExport"."isStale"` | `Boolean` | 是 | `false` | 内容是否需重新生成 |
| 生成时间 | `"ResumeExport"."generatedAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"ResumeExport"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

约束和索引：

```text
@@unique([resumeId, versionNumber, template])
@@index([resumeId, generatedAt])
@@index([resumeId, isStale])
```

## 五、岗位与投递管理字段对照

当前 PS 侧将“岗位/JD”和“投递状态”放在同一张 `"Job"` 表内。如果目标库将投递拆成独立表，需要确认一条 JD 是否允许多次投递、投递记录是否绑定简历版本。

### 5.1 岗位主表 `"Job"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 岗位 ID | `"Job"."id"` | `Int` | 是 | 自增主键 | 岗位主键 |
| 岗位名称 | `"Job"."title"` | `String` | 是 | 无 | 职位名称 |
| 公司名称 | `"Job"."company"` | `String?` | 否 | 无 | 公司 |
| JD 原文 | `"Job"."description"` | `String @db.Text` | 是 | 无 | 完整职位描述 |
| 来源链接 | `"Job"."sourceUrl"` | `String?` | 否 | 无 | 招聘链接 |
| 投递状态 | `"Job"."status"` | `String` | 是 | `draft` | 当前为字符串状态 |
| 用户 ID | `"Job"."userId"` | `Int` | 是 | 外键 | 关联 `"User"."id"`，删除用户时级联删除 |
| 创建时间 | `"Job"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"Job"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

索引：

```text
@@index([userId, updatedAt])
@@index([userId, status])
```

当前约定的 `"Job"."status"` 值：

| 状态值 | 含义 |
| --- | --- |
| `draft` | 草稿/待处理 |
| `interested` | 感兴趣 |
| `applied` | 已投递 |
| `interviewing` | 面试中 |
| `offer` | 已 Offer |
| `rejected` | 已拒绝 |
| `archived` | 已归档 |

## 六、活动统计字段对照

### 6.1 每日活动 `"DailyActivity"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 活动 ID | `"DailyActivity"."id"` | `Int` | 是 | 自增主键 | 活动记录主键 |
| 日期 | `"DailyActivity"."date"` | `DateTime @db.Date` | 是 | 与 `userId` 联合唯一 | 按天统计 |
| 投递数量 | `"DailyActivity"."applicationCount"` | `Int` | 是 | `0` | 投递动作累计 |
| 音频上传数量 | `"DailyActivity"."audioUploadCount"` | `Int` | 是 | `0` | 真实面试音频上传累计 |
| 模拟面试数量 | `"DailyActivity"."mockInterviewCount"` | `Int` | 是 | `0` | 模拟面试创建累计 |
| 用户 ID | `"DailyActivity"."userId"` | `Int` | 是 | 外键 | 关联 `"User"."id"`，删除用户时级联删除 |
| 创建时间 | `"DailyActivity"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"DailyActivity"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

约束和索引：

```text
@@unique([userId, date])
@@index([userId, date])
```

## 七、面试知识库字段对照

### 7.1 面试知识库 `"InterviewKnowledgeBase"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 知识库 ID | `"InterviewKnowledgeBase"."id"` | `String` | 是 | `cuid()` 主键 | 字符串主键 |
| 名称 | `"InterviewKnowledgeBase"."name"` | `String` | 是 | 无 | 知识库名称 |
| 描述 | `"InterviewKnowledgeBase"."description"` | `String?` | 否 | 无 | 文本描述 |
| 关注领域 | `"InterviewKnowledgeBase"."focusAreas"` | `Json?` | 否 | 无 | 标签/方向数组 |
| 用户 ID | `"InterviewKnowledgeBase"."userId"` | `Int` | 是 | 外键 | 关联 `"User"."id"`，删除用户时级联删除 |
| 创建时间 | `"InterviewKnowledgeBase"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"InterviewKnowledgeBase"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

索引：

```text
@@index([userId, updatedAt])
```

### 7.2 真实面试记录 `"RealInterviewRecord"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 记录 ID | `"RealInterviewRecord"."id"` | `String` | 是 | `cuid()` 主键 | 字符串主键 |
| 标题 | `"RealInterviewRecord"."title"` | `String` | 是 | 无 | 面试记录标题 |
| 来源类型 | `"RealInterviewRecord"."sourceType"` | `String` | 是 | 无 | 手动/音频等 |
| 面试日期 | `"RealInterviewRecord"."interviewDate"` | `DateTime` | 是 | 无 | 面试发生日期 |
| 转写文本 | `"RealInterviewRecord"."transcript"` | `String? @db.Text` | 否 | 无 | ASR 或手动文本 |
| 音频文件名 | `"RealInterviewRecord"."audioFileName"` | `String?` | 否 | 无 | 音频元数据 |
| 音频大小 | `"RealInterviewRecord"."audioFileSize"` | `Int?` | 否 | 无 | 字节数 |
| 音频 URL | `"RealInterviewRecord"."audioUrl"` | `String? @db.Text` | 否 | 无 | 可访问 URL |
| ASR 服务商 | `"RealInterviewRecord"."asrProvider"` | `String?` | 否 | 无 | 语音识别提供方 |
| ASR 模型 | `"RealInterviewRecord"."asrModel"` | `String?` | 否 | 无 | 模型名称 |
| ASR 原始 JSON | `"RealInterviewRecord"."asrRawJson"` | `Json?` | 否 | 无 | 原始返回 |
| 说话人转写 | `"RealInterviewRecord"."speakerTranscript"` | `String? @db.Text` | 否 | 无 | 带说话人的文本 |
| 角色转写 | `"RealInterviewRecord"."roleTranscript"` | `String? @db.Text` | 否 | 无 | 面试官/候选人角色文本 |
| 转写时间 | `"RealInterviewRecord"."transcribedAt"` | `DateTime?` | 否 | 无 | ASR 完成时间 |
| 记录状态 | `"RealInterviewRecord"."status"` | `String` | 是 | `ready` | 当前为字符串 |
| 构建状态 | `"RealInterviewRecord"."buildStatus"` | `String` | 是 | `not_built` | 知识库构建状态 |
| 构建错误 | `"RealInterviewRecord"."buildError"` | `String? @db.Text` | 否 | 无 | 构建失败信息 |
| 结构化内容 | `"RealInterviewRecord"."structuredContent"` | `Json?` | 否 | 无 | 结构化面试内容 |
| 分块内容 | `"RealInterviewRecord"."chunks"` | `Json?` | 否 | 无 | RAG 分块 |
| 知识库 ID | `"RealInterviewRecord"."knowledgeBaseId"` | `String` | 是 | 外键 | 关联 `"InterviewKnowledgeBase"."id"`，删除知识库时级联删除 |
| 创建时间 | `"RealInterviewRecord"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"RealInterviewRecord"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

索引：

```text
@@index([knowledgeBaseId, createdAt])
@@index([status])
@@index([buildStatus])
```

## 八、模拟面试与复盘报告字段对照

### 8.1 模拟面试会话 `"InterviewSession"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 会话 ID | `"InterviewSession"."id"` | `String` | 是 | `cuid()` 主键 | 字符串主键 |
| 面试类型 | `"InterviewSession"."type"` | `String` | 是 | 无 | 行为面/技术面等 |
| 总题数 | `"InterviewSession"."totalQuestions"` | `Int` | 是 | 无 | 会话题目总数 |
| 当前题号 | `"InterviewSession"."currentQuestion"` | `Int` | 是 | `1` | 当前进度 |
| 是否结束 | `"InterviewSession"."ended"` | `Boolean` | 是 | `false` | 会话状态 |
| JD 文本 | `"InterviewSession"."jobDescription"` | `String? @db.Text` | 否 | 无 | 岗位背景 |
| 知识库 ID 列表 | `"InterviewSession"."knowledgeBaseIds"` | `Json?` | 否 | 无 | 关联知识库的 ID 数组 |
| 问题列表 | `"InterviewSession"."questions"` | `Json?` | 否 | 无 | 面试题 |
| 问题反馈 | `"InterviewSession"."questionFeedback"` | `Json?` | 否 | 无 | 单题反馈 |
| 策略快照 | `"InterviewSession"."strategySnapshot"` | `Json?` | 否 | 无 | 创建会话时的 AI 策略 |
| 消息列表 | `"InterviewSession"."messages"` | `Json` | 是 | 无 | 对话消息 |
| 用户 ID | `"InterviewSession"."userId"` | `Int` | 是 | 外键 | 关联 `"User"."id"`，删除用户时级联删除 |
| 简历 ID | `"InterviewSession"."resumeId"` | `Int?` | 否 | 外键 | 关联 `"Resume"."id"`，删除简历时置空 |
| 开始时间 | `"InterviewSession"."startedAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 结束时间 | `"InterviewSession"."endedAt"` | `DateTime?` | 否 | 无 | 会话结束时间 |
| 更新时间 | `"InterviewSession"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

索引：

```text
@@index([userId, startedAt])
@@index([userId, ended])
@@index([resumeId])
```

### 8.2 复盘报告 `"ReviewReport"`

| 业务含义 | PS 表字段 | 类型 | 是否必填 | 默认值/约束 | 迁移说明 |
| --- | --- | --- | --- | --- | --- |
| 报告 ID | `"ReviewReport"."id"` | `String` | 是 | `cuid()` 主键 | 字符串主键 |
| 标题 | `"ReviewReport"."title"` | `String` | 是 | 无 | 报告名称 |
| 分数 | `"ReviewReport"."score"` | `Int` | 是 | 无 | 总分 |
| 等级 | `"ReviewReport"."level"` | `String` | 是 | 无 | 评级 |
| 总结 | `"ReviewReport"."summary"` | `String @db.Text` | 是 | 无 | 总体复盘 |
| 生成来源 | `"ReviewReport"."generatedBy"` | `String` | 是 | `ai` | AI 或本地生成 |
| 维度评分 | `"ReviewReport"."dimensions"` | `Json` | 是 | 无 | 多维度评分 |
| 问题复盘 | `"ReviewReport"."questions"` | `Json` | 是 | 无 | 单题复盘 |
| 下一步行动 | `"ReviewReport"."nextActions"` | `Json` | 是 | 无 | 改进建议 |
| 重点方向 | `"ReviewReport"."topDirections"` | `Json?` | 否 | 无 | 推荐提升方向 |
| 优势总结 | `"ReviewReport"."advantageSummary"` | `Json?` | 否 | 无 | 优势分析 |
| 短板总结 | `"ReviewReport"."weaknessSummary"` | `Json?` | 否 | 无 | 短板分析 |
| 面试官引导复盘 | `"ReviewReport"."interviewerSteeringReview"` | `Json?` | 否 | 无 | 面试引导分析 |
| 用户 ID | `"ReviewReport"."userId"` | `Int` | 是 | 外键 | 关联 `"User"."id"`，删除用户时级联删除 |
| 会话 ID | `"ReviewReport"."sessionId"` | `String?` | 否 | 唯一外键 | 关联 `"InterviewSession"."id"`，删除会话时置空 |
| 创建时间 | `"ReviewReport"."createdAt"` | `DateTime` | 是 | `now()` | 自动生成 |
| 更新时间 | `"ReviewReport"."updatedAt"` | `DateTime` | 是 | `@updatedAt` | 自动更新 |

索引：

```text
@@index([userId, createdAt])
```

## 九、外键关系汇总

| 子表 | 外键字段 | 父表 | 删除策略 |
| --- | --- | --- | --- |
| `"UserProfile"` | `"userId"` | `"User"."id"` | `Cascade` |
| `"Resume"` | `"userId"` | `"User"."id"` | `Cascade` |
| `"ResumeVersion"` | `"resumeId"` | `"Resume"."id"` | `Cascade` |
| `"ResumeExport"` | `"resumeId"` | `"Resume"."id"` | `Cascade` |
| `"ResumeExport"` | `"versionId"` | `"ResumeVersion"."id"` | `SetNull` |
| `"Job"` | `"userId"` | `"User"."id"` | `Cascade` |
| `"DailyActivity"` | `"userId"` | `"User"."id"` | `Cascade` |
| `"InterviewKnowledgeBase"` | `"userId"` | `"User"."id"` | `Cascade` |
| `"RealInterviewRecord"` | `"knowledgeBaseId"` | `"InterviewKnowledgeBase"."id"` | `Cascade` |
| `"InterviewSession"` | `"userId"` | `"User"."id"` | `Cascade` |
| `"InterviewSession"` | `"resumeId"` | `"Resume"."id"` | `SetNull` |
| `"ReviewReport"` | `"userId"` | `"User"."id"` | `Cascade` |
| `"ReviewReport"` | `"sessionId"` | `"InterviewSession"."id"` | `SetNull` |

## 十、唯一约束汇总

| 表 | 唯一字段/组合 | 说明 |
| --- | --- | --- |
| `"User"` | `"email"` | 邮箱唯一 |
| `"UserProfile"` | `"userId"` | 一个用户一个画像 |
| `"Resume"` | `"mineruTaskId"` | MinerU 任务唯一，可为空 |
| `"ResumeVersion"` | `("resumeId", "version")` | 同一简历版本号唯一 |
| `"ResumeExport"` | `("resumeId", "versionNumber", "template")` | 同一简历同一版本同一模板只保留一份导出 |
| `"DailyActivity"` | `("userId", "date")` | 同一用户同一天一条统计 |
| `"ReviewReport"` | `"sessionId"` | 一个模拟面试会话最多一个报告 |

## 十一、状态值约定

| 模块 | 字段 | 当前状态值 |
| --- | --- | --- |
| 岗位投递 | `"Job"."status"` | `draft`、`interested`、`applied`、`interviewing`、`offer`、`rejected`、`archived` |
| 简历解析 | `"Resume"."parseStatus"` | 默认 `not_started`，代码中可能出现解析中/成功/失败状态，合并前需按 service 再核对 |
| 简历结构化 | `"Resume"."structureStatus"` | 默认 `idle` |
| 简历优化 | `"Resume"."optimizeStatus"` | 默认 `idle` |
| 真实面试记录 | `"RealInterviewRecord"."status"` | 默认 `ready` |
| 知识库构建 | `"RealInterviewRecord"."buildStatus"` | 默认 `not_built` |
| 复盘生成来源 | `"ReviewReport"."generatedBy"` | 默认 `ai` |

## 十二、与 zpq 合并时重点核对项

1. 用户主键类型是否一致：PS 当前是 `Int autoincrement`，部分系统可能使用 `uuid` 或 `cuid`。
2. 表名是否统一：PS 当前使用 Prisma 默认驼峰表名，SQL 里需要双引号；如果目标库是 `users`、`resumes`、`jobs` 等蛇形表名，需要单独写重命名或迁移 SQL。
3. 岗位和投递是否拆表：PS 当前 `"Job"` 同时保存 JD 和投递状态，没有独立 `Application` 表。
4. 简历文件元数据是否保留：PS 当前 `"Resume"` 已包含 `originalFileName`、`originalFilePath`、`originalFileUrl`、`originalFileMime`、`originalFileSize`。
5. 简历 JD 匹配缓存是否保留：PS 当前 `"Resume"."jdMatchResult"` 用于岗位匹配结果缓存。
6. 面试知识库主键类型：PS 当前知识库和真实面试记录都是 `String cuid`，不是自增整数。
7. JSON 字段兼容性：简历内容、面试问题、报告维度、知识库分块等大量使用 `Json`，迁移时不要转成普通文本。
8. 删除策略：多数用户下属数据是 `Cascade`，简历版本/会话关联报告等局部使用 `SetNull`。
9. `.env` 和真实密钥不得进入迁移文档或 Git 仓库，只保留 `.env.example`。
10. 合并后需要验证 `npx prisma migrate deploy` 和 `npx prisma generate` 是否能从空库完整跑通。

## 十三、建议导出与核对命令

只导出结构，不导出真实数据：

```bash
pg_dump --schema-only --no-owner --no-privileges -d 数据库名 > ps-schema.sql
```

Prisma 侧核对：

```bash
npx prisma migrate status
npx prisma generate
```

后端构建核对：

```bash
npm run build
```

## 十四、合并前确认清单

```text
1. 确认最终使用 Prisma 驼峰表名，还是迁移到 PostgreSQL 蛇形表名。
2. 确认 User.id 是否继续使用 Int 自增。
3. 确认 Job 是否继续作为岗位/JD/投递三合一表。
4. 确认旧库中的投递、面试、报告数据是否需要迁移。
5. 确认所有 JSON 字段的前端读写格式是否一致。
6. 确认新增字段已有 migration，不能只改 schema.prisma。
7. 确认删除用户时级联删除的业务风险。
8. 确认生产环境真实数据库已备份。
9. 确认 .env.example 中列出了新增环境变量，但没有真实密钥。
10. 确认合并后前端 DTO、后端 DTO、Prisma schema 三者字段一致。
```
