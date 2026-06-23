# RAG 数据库执行计划

本文档用于跟踪 `知识库构建文档.md` 的实际落地进度。目标是先跑通一个最小可验证闭环：

```txt
输入模拟面试目标
  -> 生成 query embedding
  -> 用 pgvector 找 TopK knowledge_chunks
  -> 回查知识来源
  -> 拼接模拟面试官 prompt
  -> 生成一组定制化模拟面试问题
```

测试目标示例：

```txt
腾讯音乐 数据科学 推荐系统
```

## 0. 当前状态快照

- [x] 后端主语言确定为 TypeScript。
- [x] ASR 面试复盘 Python 脚本已迁移到 TypeScript。
- [x] PostgreSQL 已安装并启动。
- [x] pgvector 已安装并启用。
- [x] Prisma datasource 已切换到 PostgreSQL。
- [x] `knowledge_chunks.embedding` 已使用 pgvector `vector` 类型。
- [x] SQLite 不再作为主数据库路线。
- [x] 已完成一条真实复盘数据入库测试。
- [x] 本地安全版 embedding 生成已接入，当前使用 `local-hash-256`。
- [x] pgvector TopK 语义检索已接入。
- [x] 模拟面试官 prompt 拼接器已接入。
- [x] 本地规则版模拟问题生成已接入。
- [ ] 真实外部 embedding 模型尚未启用。
- [ ] 真实外部大模型生成模拟问题尚未启用。

当前已入库测试数据：

```txt
用户：demo_user
复盘名称：腾讯音乐_数据科学
interview_reviews: 1
review_qa_pairs: 7
review_insights: 14
knowledge_items: 17
knowledge_chunks: 17
```

## 1. 数据库和环境基础

- [x] 安装 PostgreSQL。
- [x] 安装 pgvector。
- [x] 创建数据库 `zhitou_copilot`。
- [x] 创建应用数据库用户 `zhitou_app`。
- [x] 在数据库中执行 `CREATE EXTENSION vector`。
- [x] 将真实数据库密码放入本地忽略文件，不提交 Git。
- [x] 将 `apps/backend/.postgres_password` 加入 `.gitignore`。
- [x] 更新 `.env` 的 `DATABASE_URL` 为 PostgreSQL。
- [x] 更新 `.env.example` 的 `DATABASE_URL` 示例。
- [x] 验证 PostgreSQL 服务状态为 `active`。
- [x] 验证 pgvector 可执行向量距离计算。

验收标准：

```txt
psql 可连接 zhitou_copilot
pg_extension 中存在 vector
SELECT '[1,2,3]'::vector <=> '[1,2,4]'::vector 可返回距离
```

## 2. Prisma Schema 和迁移

- [x] 将 Prisma datasource provider 改为 `postgresql`。
- [x] 删除旧 SQLite 初始化 migration。
- [x] 新增 PostgreSQL + pgvector 初始化 migration。
- [x] 在 migration 中加入 `CREATE EXTENSION IF NOT EXISTS vector`。
- [x] 新增 `knowledge_chunks` 表。
- [x] 在 `knowledge_chunks` 中加入 `embedding Unsupported("vector")?`。
- [x] 建立 `knowledge_chunks.user_id -> users.id` 关系。
- [x] 建立 `knowledge_chunks.knowledge_item_id -> knowledge_items.id` 关系。
- [x] 执行 `pnpm prisma migrate deploy`。
- [x] 执行 `pnpm db:generate`。
- [x] 执行 `pnpm build`。
- [x] 验证 `prisma migrate status` 为 up to date。

已创建的核心表：

```txt
users
user_profiles
files
interview_reviews
review_audios
review_transcripts
review_qa_pairs
review_insights
knowledge_items
knowledge_chunks
resumes
job_descriptions
job_matches
mock_interview_sessions
mock_interview_messages
tasks
ai_call_logs
```

## 3. ASR + AI 复盘产物入库

- [x] 保留原始音频文件在文件系统，不把二进制塞进数据库。
- [x] 将音频元数据写入 `files`。
- [x] 将音频和复盘记录关系写入 `review_audios`。
- [x] 将复盘主记录写入 `interview_reviews`。
- [x] 将 ASR 原始 JSON、角色文本、清洗稿写入 `review_transcripts`。
- [x] 将 AI 复盘中的 QA 拆入 `review_qa_pairs`。
- [x] 将 strengths / weaknesses / improvement_advice / next_actions 拆入 `review_insights`。
- [x] 将可复用知识点写入 `knowledge_items`。
- [x] 将可检索文本片段写入 `knowledge_chunks.chunk_text`。
- [x] 新增脚本 `apps/backend/src/scripts/review-import.ts`。
- [x] 新增命令 `pnpm review:import`。
- [x] 用 `腾讯音乐_数据科学` 跑通一次真实入库。

当前入库命令：

```bash
cd /home/CareerInvestmentCopilot/apps/backend
pnpm build
pnpm review:import -- --name 腾讯音乐_数据科学 --user-id demo_user
```

注意：

- [ ] 当前 `review:import` 还不是幂等的，重复执行会新增一套复盘数据。
- [ ] 后续需要增加 `--replace` 或基于音频 hash / review name 的去重策略。

## 4. 知识库 Chunk 构建

- [x] 第一版 chunk 已从 `knowledge_items` 同步生成。
- [x] chunk 已保存 `user_id`、`knowledge_item_id`、`source_type`、`source_id`、`chunk_text`、`tags_json`。
- [ ] chunk 还没有 token 统计。
- [ ] chunk 还没有 embedding。
- [ ] chunk 来源还没有覆盖 `review_qa_pairs`、`review_insights`、`resumes`、`job_descriptions` 的独立切片。
- [ ] 需要补一个可重复执行的 chunk 构建脚本。

建议新增命令：

```bash
pnpm knowledge:build-chunks -- --user-id demo_user
```

建议主程序：

```txt
apps/backend/src/scripts/knowledge-build-chunks.ts
```

验收标准：

```txt
给定 user_id，可以从 knowledge_items / review_qa_pairs / review_insights 生成 knowledge_chunks。
重复执行不会无限重复创建 chunk。
knowledge_chunks 中每条记录都能追踪到来源。
```

## 5. Embedding 接入

- [x] 选择本地安全测试模型：`local-hash-256`。
- [x] 确认本地测试 embedding 维度：256。
- [ ] 确认 `knowledge_chunks.embedding` 是否需要改为固定维度，如 `vector(1024)`。
- [x] 新增统一 embedding service：`apps/backend/src/ai/embedding.ts`。
- [x] 对未生成 embedding 的 chunk 批量生成向量。
- [x] 将向量写入 `knowledge_chunks.embedding`。
- [x] 写入 `knowledge_chunks.embedding_model`。
- [x] 记录 embedding 失败原因或任务状态到命令输出。
- [ ] 接入真实外部 embedding 模型。
- [x] 已接入 vivo 官方 embedding API client。
- [x] 已用无敏感样例验证 `m3e-base` 可用，返回 768 维。

建议新增命令：

```bash
pnpm knowledge:embed -- --user-id demo_user
```

当前已验证命令：

```bash
pnpm knowledge:embed -- --user-id demo_user --mock
```

建议主程序：

```txt
apps/backend/src/scripts/knowledge-embed.ts
apps/backend/src/ai/embedding.ts
```

可选 embedding 供应商：

```txt
DashScope text-embedding
蓝心 embedding
其他兼容 OpenAI embeddings API 的模型
```

当前说明：

```txt
为了避免未经确认就把用户面试文本发送到外部服务，当前先使用本地 local-hash-256 验证数据库和 RAG 链路。
如果要启用 DashScope / 蓝心等真实 embedding，需要明确允许发送 knowledge_chunks.chunk_text 到对应模型供应商。
vivo 官方文档 id=1734 中列出 `m3e-base` 和 `bge-base-zh-v1.5`，当前 AppKey 实测 `m3e-base` 可用，`bge-base-zh-v1.5` 返回 model name not supported。
```

验收标准：

```txt
knowledge_chunks.embedding 不为空
knowledge_chunks.embedding_model 有模型名称
可以用 SQL 对 embedding 执行 <=> 距离排序
```

## 6. pgvector TopK 检索

- [x] 新增 RAG 检索服务。
- [x] 输入 query 文本。
- [x] 生成 query embedding。
- [x] 用 pgvector 查询 `knowledge_chunks`。
- [x] 按 `user_id`、`status`、`embedding_model` 做 SQL 过滤。
- [x] 返回 TopK chunk。
- [x] 回查关联 `knowledge_items`。
- [x] 回查关联 `interview_reviews`。
- [x] 输出带来源的检索结果。

建议新增命令：

```bash
pnpm rag:retrieve -- --user-id demo_user --query "腾讯音乐 数据科学 推荐系统" --top-k 8
```

建议主程序：

```txt
apps/backend/src/scripts/rag-retrieve.ts
apps/backend/src/rag/retriever.ts
```

核心 SQL 形态：

```sql
SELECT
  id,
  knowledge_item_id,
  source_type,
  source_id,
  chunk_text,
  embedding <=> $query_embedding::vector AS distance
FROM knowledge_chunks
WHERE user_id = $1
  AND status = 'active'
  AND embedding IS NOT NULL
ORDER BY embedding <=> $query_embedding::vector
LIMIT $top_k;
```

验收标准：

```txt
输入：腾讯音乐 数据科学 推荐系统
输出：TopK chunks
结果中应优先出现推荐系统、embedding、商业化算法、因果推断、数据科学岗相关内容。
```

## 7. 模拟面试 Prompt 拼接

- [x] 新增模拟面试上下文构建器。
- [x] 读取用户画像 `users / user_profiles`。
- [x] 读取简历 `resumes`。
- [x] 读取岗位 `job_descriptions / job_matches`。
- [x] 读取历史 QA `review_qa_pairs`。
- [x] 读取 RAG TopK chunks。
- [x] 拼接模拟面试官 prompt。
- [x] 控制 prompt 长度，避免把全文塞给模型。
- [x] 输出 prompt 预览文件，便于人工检查。

建议新增命令：

```bash
pnpm mock:build-context -- --user-id demo_user --target "腾讯音乐 数据科学 推荐系统"
```

建议主程序：

```txt
apps/backend/src/scripts/mock-build-context.ts
apps/backend/src/mock-interview/context-builder.ts
```

Prompt 应包含：

```txt
用户画像摘要
当前简历摘要
目标岗位摘要
历史真实面试高频问题
历史短板 Top 5
RAG 召回知识片段 TopK
本次模拟面试目标
面试官提问策略
```

验收标准：

```txt
生成的 prompt 能明显体现 demo_user 的历史短板。
生成的 prompt 能围绕“腾讯音乐 数据科学 推荐系统”追问。
prompt 不直接堆整篇转写全文。
```

## 8. 调用大模型生成模拟问题

- [x] 新增本地规则版模拟面试问题生成脚本。
- [ ] 将第 7 步 prompt 输入外部大模型。
- [x] 生成第一批定制问题。
- [x] 输出结构化 JSON。
- [x] 保存到 `mock_interview_sessions`。
- [x] 保存模型消息到 `mock_interview_messages`。
- [ ] 接入真实外部大模型生成。

建议新增命令：

```bash
pnpm mock:generate-questions -- --user-id demo_user --target "腾讯音乐 数据科学 推荐系统"
```

当前已验证输出：

```txt
apps/backend/data/mock_questions/腾讯音乐_数据科学_推荐系统_questions.json
```

建议输出结构：

```json
{
  "target": "腾讯音乐 数据科学 推荐系统",
  "questions": [
    {
      "order": 1,
      "question": "你在美团项目中用了 SBERT 做语义匹配，请解释 embedding 如何把文本映射到向量空间？",
      "reason": "历史真实面试中 embedding 原理回答薄弱",
      "expected_points": ["embedding 定义", "句向量", "相似度", "业务检索场景"]
    }
  ]
}
```

验收标准：

```txt
问题不是通用八股，而是结合用户历史复盘、项目经历和目标岗位。
至少 3 个问题能追问历史短板。
至少 2 个问题围绕推荐系统 / 商业化算法 / 因果推断。
```

## 9. 最小闭环测试

- [x] 确保 `demo_user` 有复盘、知识条目、chunk。
- [x] 确保 chunk 已生成本地测试 embedding。
- [x] 执行 RAG 检索。
- [x] 构建模拟面试 prompt。
- [x] 本地规则版生成模拟问题。
- [x] 人工检查输出是否符合目标。
- [ ] 真实外部 embedding + 真实外部大模型闭环测试。

最终测试命令建议：

```bash
cd /home/CareerInvestmentCopilot/apps/backend

pnpm build
pnpm rag:retrieve -- --user-id demo_user --query "腾讯音乐 数据科学 推荐系统" --top-k 8
pnpm mock:build-context -- --user-id demo_user --target "腾讯音乐 数据科学 推荐系统"
pnpm mock:generate-questions -- --user-id demo_user --target "腾讯音乐 数据科学 推荐系统"
```

最终验收标准：

```txt
输入模拟面试目标：“腾讯音乐 数据科学 推荐系统”

系统能够：
1. 生成 query embedding
2. 使用 pgvector 从 knowledge_chunks 召回 TopK
3. 回查 knowledge_items / review_qa_pairs / interview_reviews
4. 拼接模拟面试官 prompt
5. 生成带有用户历史短板依据的模拟面试问题
```

## 10. 当前下一步

优先做：

```txt
在用户明确授权后，将本地测试版替换为真实 embedding / 大模型调用。
```

原因：

```txt
PostgreSQL、pgvector、Prisma、复盘入库、knowledge_chunks、本地 embedding、pgvector TopK、prompt 拼接、本地规则版问题生成都已跑通。
当前为了安全没有把用户面试文本和 prompt 发送到外部模型供应商。
如果要得到更真实的语义召回和大模型问题生成，需要明确允许发送对应文本到指定供应商。
```

下一次建议实现：

```txt
1. 确认真实 embedding 模型供应商和模型名
2. 清空或重建 local-hash-256 embedding
3. 使用真实 embedding 写入 knowledge_chunks
4. 使用真实大模型消费 mock prompt 生成问题
```

然后执行：

```bash
pnpm knowledge:embed -- --user-id demo_user --model 真实模型名
pnpm rag:retrieve -- --user-id demo_user --query "腾讯音乐 数据科学 推荐系统" --top-k 8
pnpm mock:generate-questions -- --user-id demo_user --target "腾讯音乐 数据科学 推荐系统"
```
