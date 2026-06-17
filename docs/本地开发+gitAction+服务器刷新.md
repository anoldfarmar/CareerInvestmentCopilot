# 本地开发 + GitHub Actions + 服务器刷新部署记录

本文记录当前项目从本地开发、推送 GitHub，到 GitHub Actions 自动 SSH 登录服务器并刷新 Docker Compose 服务的完整流程。

当前项目路径：

```bash
/home/CareerInvestmentCopilot
```

GitHub 仓库：

```bash
https://github.com/anoldfarmar/CareerInvestmentCopilot.git
```

服务器当前部署用户：

```bash
root
```

服务器部署路径：

```bash
/home/CareerInvestmentCopilot
```

## 一、先处理 GitHub main 分支

### 1. 提交部署相关文件

本次新增和修改的部署文件包括：

```bash
.env.example
.github/workflows/deploy.yml
apps/backend/.dockerignore
apps/backend/Dockerfile
apps/backend/.env.example
docker-compose.yml
```

提交命令：

```bash
cd /home/CareerInvestmentCopilot

git add .env.example \
  .github/workflows/deploy.yml \
  apps/backend/.dockerignore \
  apps/backend/Dockerfile \
  apps/backend/.env.example \
  docker-compose.yml

git commit -m "add docker compose deployment workflow"
git push origin main
```

后续为 GitHub Actions 的 `git fetch` 增加了重试逻辑，并提交：

```bash
git add .github/workflows/deploy.yml
git commit -m "retry deploy git fetch"
git push origin main
```

### 2. 验证 main 与 origin/main 一致

```bash
git status --short --branch
git log --oneline -3 --decorate
git rev-parse HEAD
git rev-parse origin/main
```

成功状态示例：

```text
## main...origin/main
HEAD -> main, origin/main
```

### 3. 真实环境文件不能提交

以下真实配置文件不提交 GitHub：

```bash
.env
apps/backend/.env
```

它们已经被 `.gitignore` 忽略。GitHub 只保存 `.env.example`。

## 二、后端需要补的 Docker 文件

### 1. 后端 Dockerfile

文件位置：

```bash
apps/backend/Dockerfile
```

用途：

- 使用 `node:22-slim` 作为基础镜像。
- 启用 Corepack。
- 使用 `pnpm-lock.yaml` 安装依赖。
- 执行 `pnpm db:generate` 生成 Prisma Client。
- 执行 `pnpm build` 编译 TypeScript。
- 暴露 `8001` 端口。

当前 TypeScript 后端还没有正式 HTTP 入口，例如 `src/main.ts` 或 `src/server.ts`，所以容器当前不是正式 API 服务，而是迁移成功后的占位运行容器。

当前占位命令：

```bash
node -e "console.log('zhitou-copilot backend image is built. Add a TypeScript HTTP entrypoint and set the compose command to pnpm start.'); setInterval(() => {}, 2147483647)"
```

后续补好正式后端入口后，应在 `apps/backend/package.json` 增加：

```json
"start": "node dist/main.js"
```

然后把 Compose 里的后端命令改成：

```yaml
command: sh -c "pnpm db:deploy && pnpm start"
```

### 2. 后端 .dockerignore

文件位置：

```bash
apps/backend/.dockerignore
```

用途：

- 排除 `node_modules`、`dist`。
- 排除真实 `.env`。
- 排除运行时数据目录。
- 减小 Docker build context。

重要内容：

```dockerignore
node_modules
dist
.env
.env.*
!.env.example
data/*
!data/.gitkeep
uploads/*
!uploads/.gitkeep
```

## 三、根目录 docker-compose.yml

文件位置：

```bash
docker-compose.yml
```

当前包含两个服务：

```text
postgres
backend
```

### 1. PostgreSQL + pgvector

镜像：

```yaml
image: pgvector/pgvector:pg16
```

原因：

当前 Prisma migration 中需要：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

所以数据库镜像使用带 pgvector 扩展的 PostgreSQL 镜像。

数据库配置：

```yaml
POSTGRES_DB: zhitou_copilot
POSTGRES_USER: zhitou_app
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-CHANGE_ME}
```

### 2. 没有暴露 PostgreSQL 到宿主机

一开始配置过：

```yaml
ports:
  - "5432:5432"
```

但服务器宿主机已有服务占用 `5432`，启动时报错：

```text
failed to bind host port 0.0.0.0:5432/tcp: address already in use
```

解决方式：

移除 PostgreSQL 的宿主机端口映射。后端容器通过 Docker Compose 内部网络访问：

```text
postgres:5432
```

这比直接暴露数据库端口更安全。

### 3. 数据库密码编码问题

服务器 `apps/backend/.env` 中原始连接串密码包含 `/`，例如 URL 中会出现编码后的：

```text
%2F
```

PostgreSQL 容器需要原始密码：

```bash
POSTGRES_PASSWORD=原始密码
```

Prisma 的 `DATABASE_URL` 需要 URL 编码后的密码：

```bash
POSTGRES_PASSWORD_ENCODED=URL编码后的密码
```

如果直接把原始密码拼进 `DATABASE_URL`，Prisma 会报错：

```text
Error: P1013: The provided database string is invalid. invalid port number in database URL.
```

最终根目录 `.env` 使用两个变量：

```bash
POSTGRES_PASSWORD=原始密码
POSTGRES_PASSWORD_ENCODED=URL编码后的密码
PUBLIC_API_BASE_URL=http://服务器公网IP:8001
```

Compose 中后端连接数据库使用：

```yaml
DATABASE_URL: postgresql://zhitou_app:${POSTGRES_PASSWORD_ENCODED:-CHANGE_ME}@postgres:5432/zhitou_copilot?schema=public
```

## 四、服务器配置

### 1. 已安装 Docker 环境

服务器已具备：

```bash
docker --version
docker compose version
```

实际检查结果：

```text
Docker version 29.1.3
Docker Compose version 2.40.3
```

### 2. 生成根目录 .env

根目录 `.env` 给 Docker Compose 使用，不提交 GitHub。

示例：

```bash
POSTGRES_PASSWORD=原始密码
POSTGRES_PASSWORD_ENCODED=URL编码后的密码
PUBLIC_API_BASE_URL=http://120.79.220.126:8001
```

### 3. Docker 镜像下载问题

服务器 SSH 配置了：

```text
RemoteForward 7890 127.0.0.1:7890
```

服务器 shell 中存在：

```bash
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

如果 Docker 拉大镜像走这个端口，会很慢或卡住。

解决方式：

执行 Docker 相关命令时清除代理变量：

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy docker compose up -d --build
```

Docker Hub 直连不稳定时，先从国内镜像代理拉取，再 tag 成 Compose/Dockerfile 需要的官方名：

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy \
  docker pull docker.m.daocloud.io/pgvector/pgvector:pg16

docker tag docker.m.daocloud.io/pgvector/pgvector:pg16 pgvector/pgvector:pg16

env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy \
  docker pull docker.m.daocloud.io/library/node:22-slim

docker tag docker.m.daocloud.io/library/node:22-slim node:22-slim
```

### 4. 启动服务

```bash
cd /home/CareerInvestmentCopilot

env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY -u all_proxy \
  docker compose up -d --build
```

检查容器：

```bash
docker compose ps
```

成功状态：

```text
zhitou-postgres   Up / healthy
zhitou-backend    Up
```

检查后端日志：

```bash
docker logs --tail 160 zhitou-backend
```

成功日志：

```text
Applying migration `20260612090000_init_postgres_pgvector`
All migrations have been successfully applied.
Prisma migrations applied.
```

检查 pgvector 和表：

```bash
docker exec zhitou-postgres psql -U zhitou_app -d zhitou_copilot \
  -c "select extname from pg_extension where extname='vector'; select count(*) as table_count from information_schema.tables where table_schema='public';"
```

成功结果：

```text
extname = vector
table_count = 18
```

## 五、GitHub Actions 配置

### 1. Repository Secrets

在 GitHub 仓库页面配置：

```text
Settings
-> Secrets and variables
-> Actions
-> New repository secret
```

需要的 Secrets：

```text
SERVER_HOST
SERVER_USER
SERVER_PORT
SERVER_SSH_KEY
PROJECT_PATH
```

当前服务器对应值：

```text
SERVER_HOST=120.79.220.126
SERVER_USER=root
SERVER_PORT=22
PROJECT_PATH=/home/CareerInvestmentCopilot
```

`SERVER_SSH_KEY` 必须填写私钥完整内容，不是 `.pub` 公钥。

私钥格式：

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### 2. SSH 授权问题

第一次 GitHub Actions 失败：

```text
ssh: handshake failed: ssh: unable to authenticate, attempted methods [none publickey], no supported methods remain
```

原因：

服务器上虽然生成了：

```bash
/root/.ssh/github_actions_deploy
/root/.ssh/github_actions_deploy.pub
```

但公钥没有加入：

```bash
/root/.ssh/authorized_keys
```

解决：

```bash
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

验证：

```bash
grep -F 'github-actions-deploy' ~/.ssh/authorized_keys
stat -c '%a %n' ~/.ssh ~/.ssh/authorized_keys ~/.ssh/github_actions_deploy
```

成功权限：

```text
700 /root/.ssh
600 /root/.ssh/authorized_keys
600 /root/.ssh/github_actions_deploy
```

## 六、添加 Workflow

文件位置：

```bash
.github/workflows/deploy.yml
```

当前 workflow：

```yaml
name: Deploy

on:
  push:
    branches:
      - main

concurrency:
  group: deploy-main
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          port: ${{ secrets.SERVER_PORT }}
          script: |
            set -e
            unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
            cd "${{ secrets.PROJECT_PATH }}"
            for attempt in 1 2 3; do
              git fetch origin main && break
              if [ "$attempt" = "3" ]; then
                exit 1
              fi
              sleep 5
            done
            git reset --hard origin/main
            docker compose up -d --build
            docker image prune -f
```

### 1. GitHub fetch 网络抖动问题

第二次 GitHub Actions 失败：

```text
fatal: unable to access 'https://github.com/anoldfarmar/CareerInvestmentCopilot.git/': GnuTLS recv error (-110): The TLS connection was non-properly terminated.
Process exited with status 128
```

原因：

Actions 已经成功 SSH 登录服务器，但服务器执行：

```bash
git fetch origin main
```

时，GitHub HTTPS 连接偶发中断。

解决：

给 `git fetch` 增加 3 次重试：

```bash
for attempt in 1 2 3; do
  git fetch origin main && break
  if [ "$attempt" = "3" ]; then
    exit 1
  fi
  sleep 5
done
```

### 2. 最终成功日志

成功执行时，GitHub Actions 日志包含：

```text
From https://github.com/anoldfarmar/CareerInvestmentCopilot
 * branch            main       -> FETCH_HEAD
HEAD is now at 5c93ede retry deploy git fetch
backend  Built
Container zhitou-postgres  Running
Container zhitou-backend  Recreated
Container zhitou-postgres  Healthy
Container zhitou-backend  Started
Total reclaimed space: 0B
Successfully executed commands to all host.
```

这表示自动部署链路已经跑通：

```text
push main
-> GitHub Actions
-> SSH 登录服务器
-> git fetch + reset
-> docker compose up -d --build
-> 容器刷新完成
```

## 日常开发流程

本地或服务器开发完成后：

```bash
cd /home/CareerInvestmentCopilot

git status
git add .
git commit -m "your message"
git push origin main
```

推送后 GitHub Actions 会自动部署服务器。

部署状态查看：

```text
GitHub 仓库
-> Actions
-> Deploy
```

服务器验证：

```bash
cd /home/CareerInvestmentCopilot
docker compose ps
docker logs --tail 100 zhitou-backend
```

## 当前注意事项

1. 当前 TypeScript 后端还没有正式 HTTP API 入口，`zhitou-backend` 是占位运行容器。
2. 后续补好 NestJS/Fastify 入口后，需要把 `docker-compose.yml` 的 command 改为 `pnpm start`。
3. `.env` 和 `apps/backend/.env` 不提交 GitHub。
4. Docker 命令建议清除 `7890` 代理环境变量后执行。
5. 服务器数据库不暴露宿主机 `5432`，仅供 Compose 内部访问。
