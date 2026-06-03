# 职投 Copilot

职投 Copilot 是面向应届生、实习生、校招生、转岗求职者和高频投递人群的 AI 求职复盘助手。

项目主线是“面试复盘驱动的个人求职知识库”：通过简历优化、岗位匹配、模拟面试和真实面试复盘，把每一次求职经历沉淀为下一次优化的训练数据。

## 技术路线

```txt
Android APK
  -> 云服务器 FastAPI Backend
    -> SQLite / uploads
    -> 蓝心大模型 API
```

手机端负责交互、录音、文件选择和结果展示。服务器负责文件解析、模型调用、Prompt 编排、数据库读写和任务状态管理。

## 目录

```txt
apps/
  android/        Android APK 工程
  backend/        FastAPI 后端工程
docs/             开发手册、API 规范、演示脚本
samples/          脱敏样例数据
scripts/          辅助脚本
.github/          PR 和 Issue 模板
```

## 先读这些

1. [开发手册](docs/开发手册.md)
2. [API 规范](docs/api规范.md)
3. [密钥管理](docs/密钥管理.md)
4. [演示脚本](docs/演示脚本.md)

## 密钥规则

不要提交真实 `.env`，即使仓库是私有仓库也不可以。真实蓝心 API Key 只放在云服务器 `.env` 或 GitHub Secrets 中。

