# 职投 Copilot API 规范

本文档记录前后端接口约定。详细原则见 [开发手册](开发手册.md)。

## 基础信息

```txt
Base URL: https://api.你的域名.com
Local URL: http://127.0.0.1:8001
API Prefix: /api/v1
```

## 统一响应

成功：

```json
{
  "success": true,
  "data": {},
  "error": null,
  "request_id": "req_20260602_001"
}
```

失败：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "COMMON_BAD_REQUEST",
    "message": "请求参数错误",
    "details": {}
  },
  "request_id": "req_20260602_001"
}
```

## 当前接口草案

```txt
GET    /api/v1/health
GET    /api/v1/tasks/{task_id}
POST   /api/v1/resumes/upload
POST   /api/v1/resumes/{resume_id}/parse
POST   /api/v1/jobs/match
POST   /api/v1/interviews/mock/start
POST   /api/v1/interviews/mock/{session_id}/answer
POST   /api/v1/reviews/upload-audio
POST   /api/v1/reviews/{review_id}/analyze
GET    /api/v1/knowledge/items
```

## 异步任务状态

```txt
pending
running
succeeded
failed
cancelled
```

