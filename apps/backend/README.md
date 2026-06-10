# 职投 Copilot Backend

FastAPI 后端负责文件上传、简历/录音解析、蓝心大模型调用、结构化结果生成、数据库读写和异步任务状态管理。

## 本地启动

```powershell
cd apps/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

访问：

```txt
http://127.0.0.1:8001/api/v1/health
http://127.0.0.1:8001/docs
```

## 服务器启动

```powershell
cd apps/backend
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

正式部署建议使用 Nginx + HTTPS + 进程守护。

## 密钥

真实 `.env` 不得提交 GitHub。蓝心 API Key 只放服务器 `.env`。

长语音转写测试需要配置：

```env
LANXIN_API_BASE_URL=api-ai.vivo.com.cn
LANXIN_APP_ID=你的AppID
LANXIN_API_KEY=你的AppKey
```

## 长语音转写测试

固定读取 `data/test.wav`：

```txt
POST http://127.0.0.1:8001/api/v1/asr/transcribe-test-audio
```

转写结果会保存到 `data/asr_results/`，其中 `.txt` 是提取后的文本，`.json` 是蓝心 API 原始返回。
