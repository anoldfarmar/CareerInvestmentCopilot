# AI 求职助手前端开发记录

> 作用：这是前端项目的活文档。每次修改页面、路由、状态、真实接口映射、Mock 开关或交互流程后，都必须同步更新本文件。
>
> 最近更新：2026-06-01
>
> 后端活文档：`../ai-job-backend/BACKEND_PROGRESS.md`

## 1. 当前技术栈

- React 18 + TypeScript + Vite
- React Router
- TanStack Query：管理服务端状态和异步请求
- Zustand：保存轻量客户端状态，例如最近使用的简历 id
- Ant Design Mobile
- Axios
- React Hook Form + Zod
- CSS Modules + CSS Variables

## 2. 项目运行

```bash
# 启动前端开发服务
npm run dev

# 生产构建
npm run build

# 运行测试
npm test
```

本地地址：

```text
http://localhost:5173
```

真实后端：

```text
http://localhost:3000
```

Swagger：

```text
http://localhost:3000/api-docs
```

## 3. 开发环境变量

文件：

```text
.env.development
```

当前配置：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK=false
VITE_APP_NAME=AI求职助手
VITE_APP_VERSION=1.0.0
VITE_ENABLE_SPEECH=true
VITE_ENABLE_SSE=true
```

注意事项：

- `VITE_USE_MOCK=false` 表示当前开发环境优先联调真实后端。
- 已接入 JWT 登录注册，不再依赖临时用户 id。
- 前端环境变量会打包进浏览器代码，禁止在 `VITE_*` 中保存任何 API Key。

## 4. 当前路由

| 路径 | 页面 | 状态 |
| --- | --- | --- |
| `/` | 首页 | 已完成 Mock 页面 |
| `/auth` | 登录与注册 | 已接入真实后端 |
| `/resume-optimize` | 简历上传、解析与优化入口 | 已接入真实解析，需登录 |
| `/resume-optimize/:resumeId` | 简历优化建议 | 当前仍使用 Mock 数据 |
| `/resume-optimize/:resumeId/suggestions` | 简历优化建议 | 当前仍使用 Mock 数据 |
| `/resume-optimize/:resumeId/compare` | 优化前后对比 | 当前仍使用 Mock 数据 |
| `/mock-interview/setup` | 模拟面试设置 | Mock 页面，需登录 |
| `/mock-interview/:sessionId/chat` | 模拟面试聊天 | Mock 页面，需登录 |
| `/mock-interview/:sessionId/progress` | 模拟面试进度 | Mock 页面，需登录 |
| `/review-report` | 复盘报告列表 | Mock 页面，需登录 |
| `/review-report/real-interviews` | 真实面试知识库列表 | Mock 页面 |
| `/review-report/real-interviews/:knowledgeBaseId` | 真实面试知识库详情 | Mock 页面 |
| `/review-report/:reportId` | 复盘报告详情 | Mock 页面 |
| `/link-manage` | 投递链接管理 | Mock 页面，需登录 |
| `/profile` | 个人中心 | 账号入口 + Mock 偏好设置 |

## 5. 第一条真实联调流程

当前已接入：

```text
进入 /resume-optimize
→ 选择 PDF 或 DOCX
→ 选择岗位方向或填写 JD
→ 点击“上传并解析”
→ POST /resumes 创建空简历记录
→ POST /resumes/:id/parse/upload 上传文件到后端
→ 后端将文件交给 MinerU
→ 前端每 2 秒调用 GET /resumes/:id/parse
→ 后端将 MinerU Markdown 保存到 PostgreSQL
→ 页面以当前简历卡片展示状态，Markdown 放入底部弹窗查看
→ 点击“一键结构化”
→ POST /resumes/:id/structure
→ 页面通过底部弹窗编辑或预览 structuredContent
→ 用户编辑 basicInfo / summary / skills / projects
→ PUT /resumes/:id/structured-content 保存人工确认后的结构化简历
→ 点击“一键优化”
→ POST /resumes/:id/optimize，携带可选 JD
→ 页面通过底部弹窗展示 optimizationNotes、优化后完整简历和前后对比
→ 用户可以编辑优化稿并保存
→ 用户满意后点击“保存当前稿”确认保存当前 optimizedContent
→ 用户可以填写进一步优化建议，继续调用 POST /resumes/:id/optimize 生成下一版
→ GET /resumes 展示已有简历列表，主页面只展示最近 3 条，全部列表放入底部弹窗
```

上传前必须完成认证：

```text
进入 /profile
→ 点击“登录或注册”
→ /auth 页面切换登录或注册模式
→ POST /auth/register 或 POST /auth/login
→ localStorage 保存 token 和基础用户信息
→ Axios 自动附带 Authorization: Bearer <JWT>
→ 上传简历时，后端从 JWT 获取用户 id
```

如果 `GET /resumes` 返回 `401`，说明不是后端未启动，而是 JWT 缺失、失效或对应用户不存在。前端 Axios 会自动清理失效 token，受保护路由会重新引导用户登录。

当前限制：

- 真实解析链路只允许 PDF 和 DOCX，不允许旧版 DOC。
- MinerU 最大文件大小为 `10 MB`。
- 点击上传后，当前页面轮询最多等待约 `4 分钟`。如果中途离开页面，再次进入时会自动找到未完成任务并恢复轮询。
- 当前上传后只展示 Markdown，不会自动跳转到旧的 Mock 建议页。
- 岗位方向和 JD 暂时只参与表单校验，下一步接入 DeepSeek 结构化和优化时使用。
- 未登录时，上传按钮不可用，并展示登录入口。
- 上传区域支持点击选择、拖拽放入以及键盘 Enter / Space 触发文件选择。
- 受限路由由 `ProtectedRoute` 统一保护。未登录访问简历、面试、复盘或投递管理时会跳转 `/auth`。

## 6. 当前真实接口映射

源码位置：

```text
src/features/resume/api.ts
```

| 前端函数 | 后端接口 | 作用 |
| --- | --- | --- |
| `createResumeForParsing()` | `POST /resumes` | 创建空简历记录 |
| `uploadResumeForParsing()` | `POST /resumes/:id/parse/upload` | 上传文件并绑定 MinerU 任务 |
| `syncResumeParsing()` | `GET /resumes/:id/parse` | 查询解析状态并触发 Markdown 落库 |
| `getResumes()` | `GET /resumes` | 查询已有简历列表 |
| `parseResumeFile()` | 组合调用以上接口 | 每 2 秒轮询 MinerU，最多 120 次 |
| `structureResume()` | `POST /resumes/:id/structure` | 调用 DeepSeek 结构化 Markdown |
| `saveStructuredResume()` | `PUT /resumes/:id/structured-content` | 保存用户确认或修正后的结构化简历 |
| `generateOptimizedResume()` | `POST /resumes/:id/optimize` | 根据结构化简历和可选 JD 生成优化稿 |
| `saveOptimizedResume()` | `PUT /resumes/:id/optimized-content` | 保存用户手动修改后的优化稿 |

DeepSeek 结构化完整简历可能超过普通接口的全局 `15 秒` 超时，因此 `structureResume()` 单独设置为最多等待 `120 秒`。页面会优先展示后端返回的具体错误信息，便于联调定位。

DeepSeek 简历优化同样可能耗时较长，因此 `generateOptimizedResume()` 也单独设置为最多等待 `120 秒`。

继续优化时，前端会把用户填写的 `additionalInstruction` 传给后端。后端会优先基于当前 `optimizedContent.optimizedResume` 继续优化，如果还没有优化稿，才从 `structuredContent` 开始。

认证接口源码：

```text
src/features/auth/api.ts
```

| 前端函数 | 后端接口 | 作用 |
| --- | --- | --- |
| `register()` | `POST /auth/register` | 注册并获取 JWT |
| `login()` | `POST /auth/login` | 登录并获取 JWT |
| `getCurrentUser()` | `GET /auth/me` | 查询当前登录用户 |

## 7. 已存在但仍需联调的后端能力

后端已经提供，前端尚未完整接入：

| 后端接口 | 下一步前端用途 |
| --- | --- |
| `PUT /resumes/:id/structured-content` | 保存用户手工编辑后的结构化简历 |
| `POST /resumes/:id/optimize` | 使用可选 JD 生成优化稿 |
| `PUT /resumes/:id/optimized-content` | 保存用户手工编辑后的优化稿 |
| `GET /resumes/:id` | 获取简历详情、结构化 JSON 和优化稿 |

后续建议流程：

```text
Markdown 展示
→ 点击“一键结构化”
→ 展示可编辑结构化表单
→ 用户确认或修改
→ 提交可选 JD
→ 点击“一键优化”
→ 展示优化前后对比
```

## 8. Mock 与真实接口并存状态

目前采用“分模块逐步接后端”策略：

1. 认证和 MinerU 简历解析使用真实后端。
2. 复盘、面试、知识库、投递管理、个人偏好暂时继续使用 Mock。
3. 简历建议页和对比页仍保留早期 Mock 分析流程，后续逐步替换。

以下旧接口在真实后端中还不存在：

```text
POST /resumes/analyze
GET /resumes/:id/analysis
GET /resumes/:id/compare
```

因此：

- `/resume-optimize` 已能联调真实上传解析。
- 建议页和对比页暂时不要依赖真实接口。
- 下一步应逐步将建议页和对比页改为读取后端 `structuredContent` 与 `optimizedContent`。
- 不要再用全局 `VITE_USE_MOCK=false` 直接切换尚未实现的后端模块，否则会请求不存在的接口。

## 9. 首页与 Header 交互

首页左上角菜单和右上角更多按钮会打开侧边栏。

侧边栏当前包含：

```text
简历优化
投递链接管理
个人求职模式
```

Header 右侧：

```text
通知按钮 → 当前显示“通知中心正在准备中”
头像按钮 → 跳转 /profile
更多按钮 → 打开侧边栏
```

首页原来的辅助入口已移入侧边栏。

## 10. 关键状态

### Zustand

源码位置：

```text
src/stores/resumeStore.ts
```

当前保存：

```text
currentResumeId
```

它会写入：

```text
localStorage.recentResumeId
```

不要把完整简历 Markdown、结构化 JSON 或优化稿写进 `localStorage`。

### TanStack Query

新增 hooks：

```text
useResumes()
useParseResume()
useResumeParseStatus()
useSaveStructuredResume()
```

`useResumeParseStatus()` 会在重新进入页面时恢复未完成任务的轮询。解析成功后会刷新：

```text
["resumes"]
```

## 11. 关键源码位置

| 文件 | 作用 |
| --- | --- |
| `src/pages/ResumeOptimizePage/ResumeOptimizePage.tsx` | 上传、轮询、Markdown 展示和已有简历列表 |
| `src/components/resume/ResumeContentPreview/ResumeContentPreview.tsx` | 简历详情通用预览组件，结构化预览和优化稿预览共用 |
| `src/components/resume/StructuredResumePreview/StructuredResumePreview.tsx` | DeepSeek 结构化结果只读预览 |
| `src/components/resume/StructuredResumeEditor/StructuredResumeEditor.tsx` | 结构化简历编辑器，当前支持 basicInfo、summary、skills、projects |
| `src/components/resume/OptimizedResumePreview/OptimizedResumePreview.tsx` | 优化稿预览，展示 optimizationNotes、优化后完整简历和模块级前后对比 |
| `src/components/resume/OptimizedResumeEditor/OptimizedResumeEditor.tsx` | 优化稿编辑器，支持修改 summary、skills、projects、optimizationNotes |
| `src/pages/AuthPage/AuthPage.tsx` | 登录与注册 |
| `src/pages/ProfilePage/ProfilePage.tsx` | 我的页面、登录入口和退出登录 |
| `src/app/router/ProtectedRoute.tsx` | 未登录用户的统一路由门禁 |
| `src/components/common/MobileHeader/MobileHeader.tsx` | Header 按钮和侧边栏 |
| `src/features/auth/api.ts` | 认证 API |
| `src/stores/authStore.ts` | JWT 和基础用户信息 |
| `src/features/resume/api.ts` | 简历接口封装 |
| `src/features/resume/hooks.ts` | 简历 TanStack Query hooks |
| `src/features/resume/types.ts` | 前端简历类型 |
| `src/services/http.ts` | Axios 实例 |
| `src/services/upload.ts` | 上传文件格式与大小校验 |
| `src/stores/resumeStore.ts` | 最近使用简历 id |
| `src/utils/validators.ts` | React Hook Form + Zod 表单校验 |

## 12. 当前验证结果

已通过：

```bash
npm run build
```

构建提示：

```text
部分 JS chunk 大于 500 kB
```

这不影响当前联调。后续可通过路由懒加载进行拆包。

## 13. 下一步计划

优先顺序：

```text
1. 把 JD 输入传给 POST /resumes/:id/optimize
2. 展示 optimizedContent 与 structuredContent 的对比
3. 将结构化预览升级为可编辑表单
4. 逐步移除简历模块旧 Mock 分析流程
```

## 14. 每次变更后的维护清单

修改前端后，检查是否需要同步更新：

```text
[ ] FRONTEND_PROGRESS.md 中的路由状态
[ ] FRONTEND_PROGRESS.md 中的真实接口映射
[ ] FRONTEND_PROGRESS.md 中的 Mock 状态
[ ] FRONTEND_PROGRESS.md 中的下一步计划
[ ] .env.development 中的环境变量
[ ] 后端 BACKEND_PROGRESS.md 中的联调进度
[ ] npm run build
[ ] npm test
```

## 15. 2026-06-11 PDF 导出前端接入

简历优化页已经接入后端 PDF 导出接口：

```text
POST /resumes/:id/export/pdf?template=<template>
```

前端新增：

- `src/features/resume/types.ts`
  - 新增 `ResumePdfTemplate = "classic" | "modern" | "sidebar" | "kendall" | "even"`。
- `src/features/resume/api.ts`
  - 新增 `exportResumePdf(resumeId, template)`。
  - 使用 `responseType: "blob"` 接收 PDF 二进制文件。
  - 从 `Content-Disposition` 读取文件名，兜底为 `resume-<id>-<template>.pdf`。
  - 使用 `URL.createObjectURL` 和隐藏 `<a>` 触发浏览器下载。
- `src/features/resume/hooks.ts`
  - 新增 `useExportResumePdf()`。
- `src/pages/ResumeOptimizePage/ResumeOptimizePage.tsx`
  - 当前简历卡片中新增 PDF 模板选择和下载按钮。
  - 优化稿预览弹窗中也新增 PDF 导出区域。
  - 可选模板：`classic`、`modern`、`sidebar`、`kendall`、`even`。

导出规则：

- 优先导出 `optimizedContent.optimizedResume`。
- 如果还没有优化稿，后端会降级导出 `structuredContent`。
- 如果既没有优化稿也没有结构化简历，前端会提示先完成结构化或优化。

本次验证：

```bash
npm run build
npm test -- --run
```

## 16. 2026-06-11 岗位/JD 管理接入

后端已提供真实 `/jobs` 接口后，前端将原“投递链接管理”模块升级为“岗位/JD 管理”。

当前页面入口：

```text
/link-manage
```

当前仍复用旧路由名 `linkManage`，但页面业务含义已经变为岗位/JD 管理。后续可以单独做一轮命名清理，将路由改为 `/jobs` 或 `/job-manage`。

真实接口映射：

| 前端函数 | 后端接口 | 作用 |
| --- | --- | --- |
| `getLinks()` | `GET /jobs` | 查询当前用户保存的岗位/JD |
| `createLink()` | `POST /jobs` | 新增岗位/JD |
| `updateLink()` | `PATCH /jobs/:id` | 修改岗位/JD |
| `deleteLink()` | `DELETE /jobs/:id` | 删除岗位/JD |

前端类型已从旧投递链接形状改为后端 `Job` 形状：

```ts
type LinkRecord = {
  id: number;
  title: string;
  company?: string | null;
  description: string;
  sourceUrl?: string | null;
  status: "draft" | "interested" | "applied" | "interviewing" | "offer" | "rejected" | "archived";
  createdAt: string;
  updatedAt: string;
};
```

简历优化页已接入岗位库选择：

```text
/resume-optimize
→ GET /jobs
→ 从岗位库选择 JD
→ 自动填入 jobDirection 和 jobDescription
→ POST /resumes/:id/optimize 时带上 JD
```

当前注意点：

- `/link-manage` 页面已经调用真实后端，不再使用本地 mock。
- 页面名称已在页面内部显示为“岗位/JD 管理”。
- 侧边栏入口文字仍可能残留旧文案，后续做 UI 文案统一时一起处理。
- 岗位/JD 管理只负责保存 JD，不负责自动投递。

本次验证：

```bash
npm run build
```

## 17. 2026-06-11 个人设置、面试、复盘真实接口接入

本轮将以下前端模块从本地 mock 切换为真实后端接口：
- `src/features/profile/api.ts`
- `src/features/knowledgeBase/api.ts`
- `src/features/interview/api.ts`
- `src/features/report/api.ts`

接口映射：
| 前端函数 | 后端接口 | 作用 |
| --- | --- | --- |
| `getProfile()` | `GET /profile` | 获取“我的”页面个人偏好 |
| `updateProfile()` | `PUT /profile` | 保存个人偏好 |
| `getKnowledgeBases()` | `GET /interview-knowledge-bases` | 获取真实面试知识库列表 |
| `getKnowledgeBase()` | `GET /interview-knowledge-bases/:knowledgeBaseId` | 获取知识库详情 |
| `createKnowledgeBase()` | `POST /interview-knowledge-bases` | 创建知识库 |
| `createManualInterviewRecord()` | `POST /interview-knowledge-bases/:knowledgeBaseId/records/manual` | 新增手动面试记录 |
| `uploadInterviewAudio()` | `POST /interview-knowledge-bases/:knowledgeBaseId/records/audio` | 上传音频记录元信息 |
| `createInterviewSession()` | `POST /interviews/sessions` | 创建模拟面试 |
| `getInterviewSession()` | `GET /interviews/sessions/:sessionId` | 查询模拟面试 |
| `submitInterviewAnswer()` | `POST /interviews/sessions/:sessionId/answer` | 提交回答 |
| `endInterviewSession()` | `POST /interviews/sessions/:sessionId/end` | 结束面试 |
| `getInterviewProgress()` | `GET /interviews/sessions/:sessionId/progress` | 查询进度 |
| `getReports()` | `GET /reports` | 获取复盘报告列表 |
| `getReport()` | `GET /reports/:reportId` | 获取报告详情 |
| `generateReport()` | `POST /reports` | 根据面试会话生成报告 |

注意：
- 这些接口都依赖登录态，前端会通过 `Authorization: Bearer <token>` 自动携带 JWT。
- 音频上传当前只接入后端元信息保存，真实语音转写后续再接。
- 面试出题和复盘报告当前是后端规则 MVP，后续升级为 AI 生成。

本轮验证：
```bash
cd front_pages
npm run build
npm test -- --run
```

结果：
```text
前端构建通过
1 个测试文件通过
1 个测试用例通过
```

## 18. 2026-06-12 契约补漏与旧页面兼容

本轮补齐真实接口接入后的页面级问题：
- [x] 手动新增真实面试记录时，请求体只发送 `title`、`interviewDate`、`transcript`，`knowledgeBaseId` 只保留在 URL path 中。
- [x] 生成复盘报告成功后，刷新 `reports` 列表缓存，并写入 `reports/<reportId>` 详情缓存。
- [x] 侧边栏入口文案改为“岗位/JD 管理”。
- [x] 旧版 `/resume-optimize/:resumeId/suggestions` 页面改为兼容提示页。
- [x] 旧版 `/resume-optimize/:resumeId/compare` 页面改为兼容提示页。

原因：
- 后端开启了严格 DTO 校验，前端不能把 path 参数重复放入 body。
- 新版简历优化工作台已经覆盖旧版分析/对比流程，旧页面继续请求早期 mock 接口会导致运行时报错。

本轮验证：
```bash
npm run build
npm test -- --run
```

## 19. 2026-06-12 首页真实概览与岗位路由升级

首页概览：
- [x] `src/features/home/api.ts` 已从纯 mock 改为登录后请求 `GET /overview`。
- [x] 未登录时首页仍展示默认引导数据，避免公开首页直接 401。
- [x] 登录后首页 KPI 会来自真实后端统计。

岗位/JD 管理路由：
- [x] 新增正式路径 `/jobs`。
- [x] 旧路径 `/link-manage` 保留，并自动跳转到 `/jobs`。
- [x] 侧边栏和简历优化页入口已改为跳转 `routePaths.jobManage`。

面试进度页：
- [x] 面试已结束时，主操作从“继续面试”改为“再练一轮”。

验证：
```bash
npm run build
npm test -- --run
```

## 20. 2026-06-12 列表分页响应兼容

后端列表接口已升级为分页响应：
```ts
{ items, total, page, pageSize }
```

前端新增：
- `src/services/pagination.ts`
  - `PaginatedResponse<T>`
  - `unwrapItems<T>()`

已适配模块：
- `src/features/resume/api.ts`：`getResumes()`
- `src/features/link/api.ts`：`getLinks()`
- `src/features/knowledgeBase/api.ts`：`getKnowledgeBases()`
- `src/features/report/api.ts`：`getReports()`

当前策略：
- 页面层暂时仍拿数组，保证现有 UI 不大改。
- API 层兼容旧数组响应和新分页响应。
- 后续做无限滚动或分页器时，再把 `total/page/pageSize` 暴露到页面。

验证：
```bash
npm run build
```
