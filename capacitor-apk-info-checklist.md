# Capacitor APK 封装信息清单

本文档用于在 Windows 上通过 Capacitor + Android Studio 将当前前端项目封装为 APK。

## 1. 前端项目

```text
前端项目：frontEnd
```

说明：

- Web 产物目录：`frontEnd/dist`
- 构建命令：`npm run build`
- Capacitor `webDir` 应填写：`dist`

## 2. App 名称

```text
App 名称：CareerInvestmentCopilot
```

说明：

- 该名称会显示在 Android 手机桌面和应用列表中。

## 3. Android 包名 / App ID

```text
Android 包名：com.careerinvestment.copilot
```

说明：

- 包名必须保持小写英文、数字和点号。
- 后续升级同一个 APK 时，不要随意修改包名，否则 Android 会认为是另一个应用。

## 4. 后端公网地址

```text
后端公网地址：http://120.79.220.126:8001
```

说明：

- APK 安装到手机后不能使用 `localhost`。
- 前端构建 APK 前，需要在 `frontEnd/.env.production` 中写入：

```env
VITE_API_BASE_URL="http://120.79.220.126:8001"
```

## 5. 前端 Web 访问地址

```text
前端 Web 地址：http://120.79.220.126:8080/
```

说明：

- 这是 Nginx 对外提供的 Web 访问入口。
- APK 封装时使用的是本地 `frontEnd/dist` 静态产物，不是直接加载 `http://120.79.220.126:8080/`。

## 6. 后端部署状态

```text
后端部署状态：已部署
手机浏览器是否能访问后端：需要在真机浏览器验证
后端测试接口地址：http://120.79.220.126:8001/overview
```

说明：

- 如果手机浏览器打不开后端接口，APK 内也无法正常请求。
- 如果接口返回 401/403 但能连接服务器，说明网络可达，属于认证问题，不是 APK 网络问题。

## 7. HTTPS 情况

```text
是否 HTTPS：后端当前使用 HTTP
```

说明：

- Android 9+ 默认限制明文 HTTP。
- Capacitor 配置中需要开启明文访问：

```ts
server: {
  cleartext: true
}
```

- Android 原生配置中也建议确认：

```xml
android:usesCleartextTraffic="true"
```

## 8. 功能权限

```text
需要的功能权限：
- 登录
- 上传文件
- 下载文件
- 录音 / 麦克风
- 文件选择
- 本地存储
```

暂不需要：

```text
- 定位
- 推送通知
- 常驻后台服务
```

说明：

- 当前项目包含简历上传、模拟面试、语音输入等能力。
- 如果 Android Studio 打包后上传文件或录音不可用，需要补充 Capacitor 插件或 Android 权限。

## 9. WebSocket / 实时功能

```text
是否需要 WebSocket：当前不确定，优先按不需要处理
WebSocket 地址：暂无
```

说明：

- 当前模拟面试流式输出更可能是 HTTP streaming / fetch 事件流，不一定需要 WebSocket。
- 如果后续语音实时识别或实时面试改为 WebSocket，再补充 `ws://` 或 `wss://` 地址。

## 10. APK 类型

```text
APK 类型：debug APK 优先，用于自己手机测试
```

后续可选：

```text
发给别人安装测试：release APK
上架应用商店：signed release / AAB
```

说明：

- 第一阶段建议先打 `debug APK`，确认登录、简历上传、模拟面试、PDF 预览等核心流程。
- 功能稳定后再生成签名版 release APK。

## 11. 本机环境

```text
Node.js 是否已安装：已安装，需确认版本建议 Node.js 20+
npm 是否可用：已可用
Android Studio 是否已安装：需要本机确认
JDK 是否已安装：通常 Android Studio 自带 JDK，建议 JDK 17
是否有 Android 手机用于真机测试：建议准备
是否已开启手机 USB 调试：需要在开发者选项中开启
```

Windows 检查命令：

```powershell
node -v
npm -v
java -version
```

## 12. 服务器与后端补充信息

```text
服务器系统：Linux
前端 Nginx 端口：8080
后端运行端口：8001
是否使用 Nginx：前端使用 Nginx
是否配置域名：暂未配置
是否配置 SSL 证书：暂未配置
数据库是否已部署：已部署
后端 .env 是否已配置：已配置
```

## 13. Windows 封装 APK 标准流程

进入项目：

```powershell
cd D:\Study\rh\zhitouCopilot\CICopilot\CareerInvestmentCopilot-feature-initial-upload\frontEnd
```

安装依赖：

```powershell
npm install
```

安装 Capacitor：

```powershell
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
```

创建生产环境 API 配置：

```powershell
'VITE_API_BASE_URL="http://120.79.220.126:8001"' | Set-Content -Encoding UTF8 .env.production
```

如果没有 `capacitor.config.ts`，创建：

```powershell
@"
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.careerinvestment.copilot',
  appName: 'CareerInvestmentCopilot',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
"@ | Set-Content -Encoding UTF8 capacitor.config.ts
```

构建前端：

```powershell
npm run build
```

如果已有 `android` 目录：

```powershell
npx cap sync android
npx cap open android
```

如果没有 `android` 目录：

```powershell
npx cap add android
npx cap sync android
npx cap open android
```

## 14. Android Studio 打包流程

打开 Android Studio 后：

```text
1. Open 项目：frontEnd/android
2. 等待 Gradle Sync 完成
3. 连接 Android 手机并开启 USB 调试
4. 点击 Run，可先真机调试
5. 确认功能正常后，选择 Build -> Generate Signed Bundle / APK
6. 测试阶段可先选择 APK
```

生成 debug APK 命令：

```powershell
cd android
.\gradlew.bat assembleDebug
```

debug APK 输出位置：

```text
frontEnd\android\app\build\outputs\apk\debug\app-debug.apk
```

## 15. 每次更新最新代码后的重新封装流程

```powershell
cd D:\Study\rh\zhitouCopilot\CICopilot\CareerInvestmentCopilot-feature-initial-upload
git fetch origin
git checkout integration/merge-zpq-ps
git pull origin integration/merge-zpq-ps

cd frontEnd
npm install
'VITE_API_BASE_URL="http://120.79.220.126:8001"' | Set-Content -Encoding UTF8 .env.production
npm run build
npx cap sync android
npx cap open android
```

## 16. 常见问题

### npx cap sync android 报错 could not determine executable to run

原因：没有安装 Capacitor CLI。

解决：

```powershell
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap sync android
```

### APK 可以打开但无法登录或请求后端

优先检查：

```text
1. frontEnd/.env.production 是否写了 VITE_API_BASE_URL
2. 后端 http://120.79.220.126:8001 是否手机可访问
3. Android 是否允许 HTTP 明文请求
4. 后端 CORS 是否允许 Capacitor WebView 请求
```

### 修改前端后 APK 没变化

需要重新执行：

```powershell
npm run build
npx cap sync android
```

只执行 Android Studio Build 不会自动拿到最新 Web 代码。

## 17. 其他备注

```text
当前建议先完成 debug APK 真机测试。
测试重点：登录、简历上传、PDF 预览、简历优化、岗位推荐、投递管理、模拟面试流式输出、复盘报告。
```
