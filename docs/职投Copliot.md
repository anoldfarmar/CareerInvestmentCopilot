# 职投Copilot开发

# 截止时间

3月16日10:00\~5月11日8:00，报名与初赛作品提交；

5月12日\~5月24日，初赛作品评审；

5月25日10:00\~7月6日8:00，复赛作品提交；



# 职投Copilot开发

快应用开发文档

https://www\.quickapp\.cn/document?menu=1%252C5\&pathUrl=%252Fdoc%252Frpk%252Ftutorial%252Foverview%252Fproject\-structure\.html



```Python
第 0 阶段：确认技术路线
快应用前端 + FastAPI 后端 + 大模型/OCR/PDF解析

第 1 阶段：快应用基础界面
首页、上传简历页、档案结果页、模拟表单页

第 2 阶段：简历上传
快应用选择文件/上传文件 → FastAPI 接收 → 保存文件

第 3 阶段：简历解析
PDF/Word/图片 → 提取文本 → 大模型结构化成 JSON

第 4 阶段：用户求职档案
展示结构化档案 → 用户编辑确认 → 后端保存

第 5 阶段：模拟招聘表单
固定招聘表单字段 → 从用户档案自动填充

第 6 阶段：打磨演示
真机运行、样例简历、演示脚本、PPT
```

### 1\.快应用环境配置

node\_module模块安装

```Python
(base) PS D:\Study\职投Copilot\quickapp-code-1> npm install --legacy-peer-deps
npm warn deprecated source-map-url@0.4.1: See https://github.com/lydell/source-map-url#deprecated
npm warn deprecated urix@0.1.0: Please see https://github.com/lydell/urix#deprecated
npm warn deprecated resolve-url@0.2.1: https://github.com/lydell/resolve-url#deprecated
npm warn deprecated source-map-resolve@0.5.3: See https://github.com/lydell/source-map-resolve#deprecated

added 270 packages, and audited 271 packages in 54s

26 packages are looking for funding
  run `npm fund` for details

6 vulnerabilities (2 moderate, 4 high)

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

1\. 核心编译引擎 \(`hap-toolkit`\)

这是快应用最灵魂的模块。它的作用类似于 Web 开发中的 Webpack \+ Babel 的组合体。

转换代码：把你在 `.ux` 文件里写的类 HTML、CSS 和 JS 代码，转换成手机原生引擎能识别的 JSON 和原生指令。

打包服务：将 `src` 目录下的源文件打包成 `.rpk` 后缀的安装包。

本地服务器：提供扫码预览功能，让你修改代码后手机能实时热更新。





# Study

## 后端环境搭建

vscode新建环境

```Python
conda create -n jobfill-backend python=3.10

(jobfill-backend) PS D:\Study\rh\职投Copilot\jobfill-copilot-demo\backend> conda list
# packages in environment at D:\Anaconda\envs\jobfill-backend:
#
# Name                    Version                   Build  Channel
bzip2                     1.0.8                h2bbff1b_6    defaults
ca-certificates           2026.3.19            haa95532_0    defaults
libexpat                  2.7.5                hd7fb8db_0    defaults
libffi                    3.4.4                hd77b12b_1    defaults
libzlib                   1.3.1                h1c6eee0_1    defaults
openssl                   3.5.6                hbb43b14_0    defaults
packaging                 26.0            py310haa95532_0    defaults
pip                       26.0.1             pyhc872135_1    defaults
python                    3.10.20              h1044e36_0    defaults
python-multipart          0.0.27                   pypi_0    pypi
setuptools                82.0.1          py310haa95532_0    defaults
sqlite                    3.51.2               hee5a0db_0    defaults
tk                        8.6.15               hf199647_0    defaults
tzdata                    2026a                he532380_0    defaults
ucrt                      10.0.22621.0         haa95532_0    defaults
vc                        14.3                h2df5915_10    defaults
vc14_runtime              14.44.35208         h4927774_10    defaults
vs2015_runtime            14.44.35208         ha6b5a95_10    defaults
wheel                     0.46.3          py310haa95532_0    defaults
xz                        5.8.2                h53af0af_0    defaults
zlib                      1.3.1                h1c6eee0_1    defaults
```

执行

```Python
cd .\jobfill-copilot-demo
mkdir backend
cd backend
notepad main.py
```

main\.py

```Python
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from datetime import datetime

app = FastAPI(title="JobFill Copilot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"message": "JobFill Copilot backend is running"}

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    print("收到文件字段:", file.filename)

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".doc", ".docx"]:
        return {"error": "仅支持 PDF、DOC、DOCX 文件"}

    filename = datetime.now().strftime("%Y%m%d%H%M%S_") + file.filename
    path = os.path.join(UPLOAD_DIR, filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "上传成功",
        "filename": filename,
        "saved_path": path,
        "content_type": file.content_type,
        "size": os.path.getsize(path)
    }
```

安装FastAPI和Uvicorn

```Python
pip install fastapi uvicorn
```

启动后端

```Python
uvicorn main:app --reload
默认监听8000端口 http://127.0.0.1:8000
```

显示以下即成功

\{"message":"JobFill Copilot backend is running"\}

之后测试

http://127\.0\.0\.1:8000/docs

能否上传简历保存至本地文件夹

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MjE1Y2M5OTU3NjdkMWMxOGE1YjQ1MmNhN2MyZTEzZjZfODc3M2YzNDNhNjUzZjgxN2U1Yzc4ZjRkNDc3YjY0YjdfSUQ6NzYzMzk5NTY1NDU4MzIwODkyOF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## 制作前端上传页面

```SQL
(jobfill-backend) PS D:\Study\rh\职投Copilot\jobfill-copilot-demo\backend\uploads> dir
(jobfill-backend) PS D:\Study\rh\职投Copilot\jobfill-copilot-demo\backend\uploads> cd ../..
(jobfill-backend) PS D:\Study\rh\职投Copilot\jobfill-copilot-demo> npm create vite@latest .\frontend\
Need to install the following packages:
create-vite@9.0.6
Ok to proceed? (y) y


> npx
> create-vite .\frontend\

│
◇  Package name:
│  javascript
│
◇  Select a framework:
│  React
│
◇  Select a variant:
│  JavaScript
│
◇  Install with npm and start now?
│  Yes
│
◇  Scaffolding project in D:\Study\rh\职投Copilot\jobfill-copilot-demo\.frontend...
│
◇  Installing dependencies with npm...

added 136 packages, and audited 137 packages in 20s

31 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
│
◇  Starting dev server...

> javascript@0.0.0 dev
> vite


  VITE v8.0.10  ready in 2173 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
10:07:22 [vite] (client) hmr update /src/App.jsx

```

确认后端运行

```YAML
(jobfill-backend) PS D:\Study\rh\职投Copilot\jobfill-copilot-demo\backend> uvicorn main:app --reload
INFO:     Will watch for changes in these directories: ['D:\\Study\\rh\\职投Copilot\\jobfill-copilot-demo\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [22468] using StatReload
INFO:     Started server process [2200]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

前端启动

```Python
(jobfill-backend) PS D:\Study\rh\职投Copilot\jobfill-copilot-demo> cd .\.frontend\
(jobfill-backend) PS D:\Study\rh\职投Copilot\jobfill-copilot-demo\.frontend> npm run dev    

> javascript@0.0.0 dev
> vite


  VITE v8.0.10  ready in 366 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```



USB调试报错：

```Python
“上传失败：20001 Failed to connect to /127.0.0.1:8000”
```

原因其实有两层，叠在一起就变成了这个报错。

**具体原因**

1. 你的 FastAPI 后端原来跑在 `127.0.0.1:8000`，而快应用里也写了：

`http://127.0.0.1:8000/upload`

2. 手机上运行快应用时，`127.0.0.1` 指的是“手机自己”，不是电脑。所以手机去连 `/127.0.0.1:8000`，等于在找手机本机的 `8000` 服务，自然连不上。

3. 同时 QuickApp Studio 调试链路也可能会用本机端口做上传/调试服务，之前电脑的 `8000` 已经被你的 FastAPI 后端占用，所以容易出现端口冲突或连接错服务。

4. 你后端原来用 `uvicorn main:app --port 8000` 启动时，默认只监听 `127.0.0.1`，这表示只允许电脑本机访问，局域网里的手机访问不到。

**解决办法**

我们做了两件事

1. 后端改成监听所有网卡，并换到 `8001`：

    ```PowerShell
    uvicorn main:app --host 0.0.0.0 --port 8001
    ```

2. 快应用上传地址改成电脑的局域网 IP：

    ```JavaScript
    uploadUrl: 'http://10.23.15.179:8001/upload'
    ```

这样手机访问的是电脑真实 IP，而不是手机自己的 `127.0.0.1`；后端也允许局域网设备连接，所以上传成功。

**以后记住**

- 电脑本机访问后端：可以用 `http://127.0.0.1:8001`

- 手机访问电脑后端：必须用 `http://电脑局域网IP:8001`

- 后端要给手机访问：启动时加 `--host 0.0.0.0`

- 避免把业务后端和调试工具都放在 `8000`，推荐业务后端用 `8001`、`3000`、`5000` 这类端口。

# 复赛



# 初赛报告撰写

## 团队介绍

团队名称 长湖大队

钟培琦 广东工业大学 前端开发与AI工程

潘帅 广东工业大学 AI工程与后端开发

杨子泰 南开大学 产品经理

易金鹏 广东药科大学 前端开发与交互设计

指导老师 广东工业大学 杨祖元

## 作品简介

**作品名称** 

职投Copilot

**作品概述 **

“职投 Copilot”是一款面向应届生、实习生、校招生及转岗求职者的 AI 求职复盘助手。作品以用户简历、岗位信息、模拟面试与真实面试复盘数据为核心，构建专属于用户的个人求职知识库。系统提供简历优化、岗位匹配与投递跳转、投递进度管理、模拟面试和面试复盘五大功能，帮助用户完成从岗位筛选、投递管理、面试训练到经验沉淀的完整闭环。其创新点在于不只生成简历或推荐岗位，而是通过大模型和多模态能力，对用户每一次面试录音和复盘内容进行清洗、归纳和结构化保存，持续发现用户表达短板与能力差距，辅助下一轮简历优化和面试训练，让求职过程从“盲目海投”转变为“数据驱动的持续成长”。

### **作品宣传海报**



#### 海报

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NmVmYzI1NWNiMWZhOGY5MzhiZGVjOGFkNTg0OGEzNGJfMGZmZWNiYTg2ODQxOGZlYWY1ZTMyMjg5MzNiYWI4ZGJfSUQ6NzYzNzAzNzQ2MTg3Mjk3MDk3NF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## 作品策划

### 作品设计理念

#### **核心创新点**

职投 Copilot 的核心创新在于将传统求职工具从“简历生成与岗位投递”升级为“求职全过程复盘与能力成长系统”。区别于传统 AI 求职工具仅聚焦简历优化、岗位推荐或简单投递记录，本项目将产品核心升级为求职全流程闭环成长系统。以 “投递 — 面试 — 复盘 — 优化” 的完整逻辑，串联简历优化、岗位匹配、投递管理、模拟面试、面试复盘五大模块，把每一次求职经历沉淀为可复用的个人经验资产，解决 “盲目海投、无法复盘、持续成长难” 的行业痛点，实现从 “工具辅助” 到 “能力赋能” 的价值升级。

#### **设计背景与洞察**

当前求职过程存在岗位信息分散、简历难以精准匹配、投递流程混乱、面试准备缺乏针对性、面试结束后经验难以沉淀等问题。尤其对于应届生、实习生和转岗求职者来说，求职失败往往不是因为没有经历，而是因为不会表达、不会复盘、不会根据反馈持续优化。与此同时，AI 正在进入招聘筛选和面试评估流程，求职者也需要一个站在自身角度的 AI 工具，帮助其理解岗位、训练表达、沉淀经验并持续提升求职竞争力。

#### 理念贯穿性

作品始终围绕“让每一次面试，都成为下一次成功的训练数据”这一理念展开。简历优化帮助用户更好呈现能力，岗位匹配帮助用户选择更合适机会，投递管理帮助用户掌控求职节奏，模拟面试帮助用户提前训练表达，面试复盘则将真实面试经历转化为可复用的个人知识资产。五个模块共同构成从求职准备到面试反馈再到能力提升的完整闭环，使用户从盲目海投转向数据驱动的持续成长。

### 产品原型设计

#### 核心功能解读

职投Copilot是一款面向多类求职者的AI求职辅助应用，核心亮点的是聚焦求职全流程复盘与归纳，通过简历优化、岗位匹配、投递管理、模拟面试、面试复盘五大模块联动，沉淀个人求职知识库，实现“投递—复盘—优化”的闭环，帮助用户持续积累求职经验、提升求职成功率。

#### 作品的界面设计

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjBkNmM0MWQ4NGE3OWZjMzIzMTgzYTM3YjMzMTllODBfMjZiZWJhMGVjOTdmM2M1M2I5YzhlNDI0ZmY3MzFmMjdfSUQ6NzYzNzUxNzg0ODIxNDE3ODc3Ml8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

##### （1）整体视觉风格、色彩体系及设计理由

整体视觉风格为**极简清新风\+商务质感**，兼顾易用性与专业性，拒绝冗余设计，聚焦求职复盘与流程管理核心需求，让用户快速切换功能、整理复盘内容，缓解求职焦虑。色彩体系以“主色：薄荷绿（\#4ECDC4）\+ 辅助色：奶白（\#F9FAFB）\+ 强调色：浅蓝（\#60A5FA）”为主，设计理由如下：

- 薄荷绿主色：传递清新、治愈的调性，缓解求职者的焦虑情绪，同时体现“成长、积累”的产品内核，契合复盘归纳、持续优化的定位；

- 奶白辅助色：作为背景底色，提升界面整洁度，突出核心内容（如复盘记录、投递进度），避免视觉干扰，长时间使用不疲劳；

- 浅蓝强调色：用于按钮、进度标记、核心操作入口及复盘重点标注，吸引用户注意力，同时传递专业、可靠的质感，适配求职场景的严肃性。

##### （2）关键界面展示

**① 核心展示主页**

效果图说明：主页采用“顶部状态栏\+左侧功能导航\+右侧主内容区”的布局，顶部显示用户求职核心数据概览（已投递岗位数、面试次数、复盘记录数、Offer数）及待办提醒（笔试时间、面试时间）；左侧导航清晰划分“简历优化、岗位匹配、投递管理、模拟面试、面试复盘、个人知识库”6大核心模块，图标简洁直观，hover时显示功能简介；右侧主内容区为“求职闭环指引”，依次展示“简历优化→岗位匹配→投递管理→模拟面试→面试复盘”的流程节点，每个节点标注当前进度，点击节点可直接跳转对应模块，同时显示近期复盘重点和高匹配度岗位推荐，凸显“闭环成长”的核心定位。

**② 核心功能界面（面试复盘界面）**

效果图说明：界面分为上中下三部分，上部为操作入口，支持“上传录音、手动输入面试记录、导入面试问题”三种方式，按钮清晰易懂；中部为复盘处理区，左侧显示原始录音/输入内容，右侧为大模型处理后的结构化复盘结果，自动分类为“面试基本信息（公司、岗位、轮次）、面试问题、我的回答、面试官反馈、薄弱点、改进建议”，关键信息（如薄弱点、改进建议）用浅蓝强调色标注；下部为复盘保存与复用区，支持“添加至个人知识库、关联对应岗位、同步至模拟面试题库”，用户可直接点击“同步优化简历”，让复盘结果反向作用于简历优化，实现数据联动。

**③ 其他重要界面（投递管理界面）**

效果图说明：界面采用看板式设计，左侧为流程模块自定义区，用户可添加、删除、调整求职流程节点（如待投递、已投递、待笔试、待一面等），适配不同公司的招聘流程；右侧为岗位投递列表，每个岗位以卡片形式展示，标注公司、岗位名称、匹配度、当前进度（用不同颜色标签区分：灰色=待处理、蓝色=进行中、绿色=通过、红色=未通过），卡片内可快速查看投递时间、笔试/面试时间及跟进提醒；点击卡片可展开详情，编辑进度、添加备注（如面试时间、面试官提示），同时关联该岗位的复盘记录，实现投递与复盘的无缝衔接，本质上是贴合求职场景的智能备忘录。

#### 作品的交互设计

**（1）核心用户操作流程（以“面试复盘→模拟面试→简历优化”闭环为例）**

选取产品最具特色的“复盘\-优化”闭环流程，用分步流程图说明，贴合用户真实求职场景，步骤如下：

1. 用户完成真实面试后，进入“面试复盘”模块，点击“上传录音”，选择面试录音文件，系统自动开始转写（显示转写进度条）；

2. 转写完成后，大模型自动清洗、归纳转写内容，生成结构化复盘结果，用户可手动补充遗漏的面试问题、面试官反馈，调整薄弱点和改进建议；

3. 用户点击复盘界面底部“同步至模拟面试”，系统自动将复盘数据（面试问题、薄弱点）同步至模拟面试模块，生成针对性的模拟面试题库；

4. 用户进入“模拟面试”模块，系统基于用户简历、目标岗位JD及刚同步的复盘数据，生成定制化虚拟面试官，用户开始模拟面试，系统实时记录回答内容；

5. 模拟面试结束后，系统给出评分和改进建议，用户点击“关联简历优化”，系统自动将模拟面试中暴露的薄弱点（如项目描述不清晰、技术细节不足）同步至简历优化模块，给出针对性修改提示；

6. 用户进入“简历优化”模块，查看系统结合复盘、模拟面试数据给出的优化建议，手动微调或点击“一键优化”，更新简历内容，完成“复盘—模拟—优化”的闭环，为下一次投递做准备。

流程图补充：每个步骤均有明确反馈（如“转写中”“复盘完成”“同步成功”“优化提示已生成”），流程衔接顺畅，突出“每一次复盘都能转化为优化动力”的核心逻辑，无需用户手动关联各模块数据。

**（2）交互设计中的创新之处**

1\.  复盘数据联动交互：创新实现“面试复盘—模拟面试—简历优化”的自动联动，用户无需手动操作，复盘数据可直接同步至其他模块，例如复盘时标记的“技术薄弱点”，会自动同步到模拟面试题库和简历优化建议中，实现数据复用，让优化更具针对性，打破传统求职工具各模块孤立的痛点。

2\.  多模态复盘交互：支持“录音转写\+手动输入\+语音补充”多方式复盘，用户可上传面试录音自动转写，也可手动输入面试问题，还能通过语音补充复盘细节（如“面试官额外提到的岗位要求”）；同时，模拟面试支持语音回答和文字回答两种模式，贴合真实面试场景，语音回答可自动转写并分析表达流畅度，给出针对性建议，提升交互的便捷性和真实性。

3\.  模块化进度自定义交互：投递管理界面支持用户自定义求职流程节点，可拖拽调整节点顺序、添加专属节点（如“测评环节”“群面环节”），每个节点可设置提醒时间，系统会在对应时间推送通知，避免用户遗漏重要节点，适配不同公司、不同岗位的招聘流程差异，提升交互的灵活性。

#### 大模型的具体应用说明

本作品以多模态大模型为核心，结合RAG技术构建个人求职知识库，贯穿五大模块，重点应用于复盘归纳与闭环优化，具体说明如下：

- 1\.  简历优化模块：大模型结合用户上传的简历、目标岗位方向及历史复盘数据，分析简历存在的问题（表达不专业、重点不突出等），结合用户选择的优化方向（如突出技术深度、面向校招），改写语句、优化排版、突出项目重点，生成多版本简历，避免模板化，贴合用户真实经历。

- 2\.  岗位匹配模块：大模型解析后台爬取的岗位JD，提取核心要求（专业、技能、经验等），与用户简历进行多维度语义匹配，计算量化匹配度，对岗位进行排序，同时结合用户复盘数据（如过往面试反馈的岗位适配问题），优化推荐逻辑，避免推荐与用户薄弱点不符的岗位。

- 3\.  模拟面试模块：多模态大模型基于用户简历、目标岗位JD及历史面试复盘数据，生成定制化虚拟面试官和面试问题，模拟不同面试场景；实时分析用户回答（语音/文字），从回答完整度、逻辑结构、岗位匹配度等维度评分，识别薄弱点，给出可落地的改进建议。

- 4\.  面试复盘模块：大模型负责录音转写后的内容清洗、归纳和结构化处理，自动提取面试关键信息（面试问题、薄弱点、面试官反馈等），生成标准化复盘记录，同时随着复盘数据积累，归纳用户高频薄弱点，形成个人求职知识库，为后续模块提供数据支撑。

- 5\.  全模块数据联动：大模型整合简历、投递、模拟面试、复盘全量数据，构建用户个人求职画像，实现各模块数据互通，例如将复盘发现的薄弱点反向作用于简历优化和模拟面试，让每一次复盘都能驱动用户求职能力提升，形成闭环优化。

### 创新点说明

#### 解决方案创新

从 “投递工具” 升级为 “求职全流程成长系统”。传统 AI 求职工具多停留在简历润色、岗位推荐、简单填表等单点环节，无法解决用户 “盲目海投、面试难复盘、经历难沉淀、能力难提升” 的核心痛点。本项目突破这一局限，创新性提出 “投递 — 面试 — 复盘 — 优化” 的求职全流程闭环解决方案 ，打造面向应届生、实习生和高频求职者的「个人求职成长助手」。整个方案以 “用户成长” 为核心，将求职过程从一次性消耗转变为持续优化的能力提升过程，真正解决了传统工具功能孤立、缺乏闭环、无法赋能用户长期成长的问题。

#### 交互创新

1\.复盘数据自动联动交互：创新实现 “面试复盘 — 模拟面试 — 简历优化” 的跨模块数据联动，用户无需手动操作，面试复盘中标记的薄弱点、高频问题会自动同步至模拟面试题库和简历优化建议，实现 “发现问题 — 针对性训练 — 迭代优化” 的全链路自动化，打破传统求职工具模块孤立的行业痛点。

2\.多模态求职交互体系：面试复盘支持 “录音转写 \+ 手动输入 \+ 语音补充” 三种方式，模拟面试同时支持语音 / 文字两种交互模式，贴合真实面试场景；语音回答可自动转写并分析表达流畅度，为用户提供更自然、更贴近真实求职场景的交互体验。

3\.模块化进度自定义交互：投递管理界面采用看板式设计，用户可自定义求职流程节点（如测评、群面、技术面），拖拽调整流程顺序，适配不同企业的招聘节奏，解决了传统工具固定流程无法适配多样求职场景的问题

#### 功能与性能创新

1\.结构化个人求职知识库构建：系统不只是存储用户简历，更会沉淀面试问题、回答表现、薄弱点、面试官反馈等全量数据，随着用户求职次数增加，自动归纳高频短板、岗位关注重点，形成专属求职经验库，为后续简历优化、模拟面试提供精准支撑，实现 “数据驱动的求职成长”。

2\.岗位定制化 AI 辅助能力：简历优化结合用户目标岗位方向，提供 “突出技术深度、面向大厂校招、面向国企” 等多风格改写；模拟面试基于简历、岗位 JD 和历史复盘数据，生成定制化面试官和问题；开放题回答严格基于用户真实经历生成，兼顾岗位匹配度与内容真实性。

3\.合规化求职投递设计：产品不强行绕过招聘平台限制，不做自动投递、批量海投等存在合规风险的功能，而是采用 “岗位推荐 \+ 官网跳转” 的辅助投递模式，由用户自主完成最终投递，兼顾实用性、安全性与招聘公平性，避免简历造假与平台规则冲突的问题

### 前景评估

#### 用户需求程度

#### （1）目标用户画像

“职投Copilot”的核心目标用户是处于求职高频阶段的人群，主要包括寻找实习机会的在校大学生、参加校园招聘的应届毕业生，以及正在跳槽或转岗的社会招聘求职者。这类用户通常会在BOSS直聘、智联招聘、猎聘等招聘平台上持续浏览岗位、投递简历，并频繁参加线上面试。尤其是在高校毕业生规模持续处于高位的背景下，求职竞争压力进一步加大。2025届全国普通高校毕业生规模预计达到1222万人，同比增加43万人，说明应届生就业市场本身就具有庞大的用户基数和较强的求职服务需求。

这类用户的共同特点是：求职意愿强、投递频率高、面试机会多，但缺乏系统性的面试复盘能力。他们并不只是需要“找到岗位”，更需要知道自己为什么面试失败、如何针对具体岗位改进表达、怎样在下一次面试中更准确地展示自身优势。因此，本作品面向的是具有真实求职压力、真实面试场景和持续提升需求的用户群体。

#### （2）核心痛点与需求

当前求职者的主要痛点并不是简单的“不会写简历”或“找不到面试题”，而是缺乏一个能够长期记录、分析并指导其求职表现的系统工具。很多用户即使简历背景较好，也能够获得面试机会，但由于面试表达缺乏重点、回答逻辑不够清晰、岗位匹配意识不足，最终仍然难以通过面试。

具体来看，用户在面试准备中存在三类高频问题。第一，用户难以准确理解岗位JD中的核心能力要求，不知道自己应该重点准备哪些内容。第二，用户无法有效识别自身在过往面试中的共性问题，例如自我介绍缺少岗位针对性、项目经历表达不够结构化、专业工具或行业知识准备不足等。第三，用户缺少低成本的复盘方法。传统方式下，用户需要自己保存录音、转写文字、整理回答、归纳问题，再把内容输入大模型进行分析，流程繁琐，导致多数用户即使经历了多次失败面试，也没有进行复盘分析，很难真正从中沉淀经验。

因此，“职投Copilot”满足的是一种强需求：帮助用户把零散的面试经历转化为可积累、可分析、可迭代的个人求职知识库，并根据下一轮岗位要求提供个性化准备方案。

#### （3）应用场景

**场景一：面试结束后的自动复盘。**
例如，用户小杨正在应聘产品经理实习生岗位。他的学历背景和项目经历较好，也收到了不少公司的面试邀请，但连续参加多场面试后仍未获得理想结果。使用“职投Copilot”后，小杨可以在每次线上面试结束后上传面试录音，系统会自动完成语音转写、内容清洗和结构化分析，并指出他在面试中的具体问题。例如，系统可能发现他的自我介绍虽然信息丰富，但没有突出与产品经理岗位的匹配度；在介绍项目经历时，缺少用户需求、产品方案和数据结果的表达；在回答专业问题时，对Axure、Figma等产品工具的掌握不够充分。通过这种方式，用户能够明确知道自己下一步应该改进什么，而不是只停留在“这次又没过”的模糊感受中。

**场景二：下一轮面试前的针对性准备。**
当小钟准备参加下一场算法工程师岗位面试时，可以将该岗位JD上传至平台。系统会结合他的简历、过往面试在一般性问题上的表现、在算法岗面试中专业问题上的表现和目标岗位要求，生成个性化准备建议，包括岗位能力匹配分析、需要补强的专业知识、可能被追问的问题，以及更适合他的回答思路。相比通用面试题库，这种准备方式更贴近用户个人经历，也更贴近目标岗位要求，能够帮助用户在短时间内完成更有针对性的面试训练。

#### （4）社会价值

本作品的社会价值在于提升求职过程中的信息透明度和个人成长效率。现实中，部分求职者并非能力不足，而是缺少表达训练、岗位理解和面试复盘方法，导致自身优势没有在面试中被充分展示。“职投Copilot”能够帮助这类用户降低因表达不清、准备不足或复盘缺失而错失机会的概率。

对于学生群体而言，本作品可以补充高校就业指导中个性化辅导不足的问题；对于社招和转岗人群而言，它可以帮助用户更快适应不同岗位、行业和面试风格。整体来看，本产品有助于让求职过程从“盲目海投、反复失败”转向“记录经验、发现问题、持续改进”的数据驱动模式，从而提升个人就业质量和人才匹配效率。

#### 市场欢迎程度

从市场环境来看，“职投Copilot”具有较高的接受基础。首先，在线招聘已经形成成熟的用户习惯。以BOSS直聘为例，截至2025年12月31日，其累计服务超过2\.25亿用户和1660万企业，2025年月均活跃用户数达到5300万，说明线上招聘和线上求职已经是大规模、高频次的刚性场景。其次，AI工具的用户接受度正在快速提高。中国互联网络信息中心发布的报告显示，截至2025年6月，我国生成式人工智能用户规模达到5\.15亿人，较2024年12月增长2\.66亿人，用户规模半年翻番；其中，回答问题、办公辅助、内容创作等场景已经成为常见用法。这说明用户已经逐渐习惯通过AI解决学习、工作和决策类问题，为AI求职产品的推广提供了良好的市场基础。

从行业竞品来看，目前市场上已经存在一些AI求职相关工具。例如，部分招聘平台已经提供简历诊断、面试刷题、AI问答和模拟面试等服务；BOSS直聘也在求职者端探索AI问答、模拟面试等功能。此外，OfferGoose、HiOffers等产品也主打AI模拟面试、简历优化、JD匹配、面试复盘等功能。这说明AI求职辅助并不是一个完全空白的市场，而是一个正在被验证、正在形成用户认知的新兴赛道。

但“职投Copilot”的优势在于，它不是只解决某一个单点问题，而是强调从**简历优化、岗位匹配、投递管理、真实面试复盘到下一轮面试准备**的完整闭环。现有许多工具更偏向“面试前训练”或“即时问答辅助”，而本作品更突出“真实面试数据沉淀”。用户每完成一次面试，系统就能将录音和复盘结果纳入个人求职知识库，持续识别用户的长期短板和岗位相关问题。随着使用次数增加，系统给出的建议会更加贴合用户个人情况，形成持续成长型产品体验。

在功能创新性方面，本产品的核心亮点是将大模型能力、多模态处理能力和求职过程管理结合起来。用户不需要手动整理录音、转写文本和归纳问题，只需上传面试录音和目标岗位JD，系统即可自动完成内容清洗、问题提取、短板分析和下一轮准备建议生成。这种设计降低了用户复盘成本，也提高了真实面试经验的利用价值。

在用户体验方面，本产品符合求职者“时间紧、任务多、反馈需求强”的特点。高频求职用户往往同时投递多个岗位、参加多场面试，如果每次都依靠人工整理经验，成本很高。而“职投Copilot”能够把复杂的复盘流程简化为“上传材料—获得分析—针对训练”的路径，让用户快速知道自己哪里做得不好、下一场应该怎么准备、哪些问题可能被问到。这种低操作成本和高反馈价值，有利于提升用户留存和口碑传播。

在商业模式方面，本产品具有较强的拓展空间。面向个人用户，可以采用基础功能免费、高级复盘报告付费、模拟面试次数订阅、岗位定制训练包付费等模式；面向机构端，可以与高校就业指导中心、职业培训机构、招聘平台合作，为学生或求职者提供批量化就业辅导服务。由于求职成功直接关系到用户的职业发展和收入预期，用户对高质量、个性化求职服务具有一定付费意愿。

综上，“职投Copilot”所处市场具有用户基数大、求职痛点强、AI接受度提升和竞品教育初步完成等优势。与现有单点式AI求职工具相比，本作品更强调真实面试数据的长期积累和求职全流程闭环，能够为用户提供更连续、更个性化、更具操作性的求职支持，因此具有较高的市场欢迎程度和推广潜力。

# ====IDEA===第二版\-0506版本===

职投Copilot

与第一版不同的是将功能重点转移到求职的过程中复盘归纳，根据用户简历和用户面试复盘建造独属于用户自己的求职助手。

## 模块1：简历优化

依据用户的项目经历和技术栈以及用户选择，大模型优化用户简历，比如字段排版、语句专业化、项目简化突出重点。

## 模块2：岗位匹配与投递

从后台数据库（爬取各个公司的招聘界面）中针对用户简历，推荐合适岗位，给出量化指标排序岗位。投递由于各大招聘平台并不开放数据，在投递中就直接跳转公司招聘的网页端用户自己投递。

## 模块3：投递管理界面

显示各个岗位的投递进度（已投递、待笔试、待面试、Offer等多个环节），各个岗位招聘流程不一样可以设计模块化管理流程，进度由用户自己管理和更新，该模块主要充当备忘录。

## 模块4：模拟面试

使用多模态大模型，根据用户投递岗位、简历和**模块5**中的面试复盘数据，定制面试官，模拟面试场景。并在面试后给用户打分，给出改进建议。

## 模块5：面试复盘

针对用户面试后所记录录音文件，将其转文字后，用大模型清洗和归纳重点内容，结构化保存，形成完整的知识体系，一步实现总结归纳的效果。





# 职投Copilot应用功能设计（第二版）

## 核心功能解读

职投Copilot是一款面向多类求职者的AI求职辅助应用，核心亮点的是聚焦求职全流程复盘与归纳，通过简历优化、岗位匹配、投递管理、模拟面试、面试复盘五大模块联动，沉淀个人求职知识库，实现“投递—复盘—优化”的闭环，帮助用户持续积累求职经验、提升求职成功率。

## 作品的界面设计

### （1）整体视觉风格、色彩体系及设计理由

整体视觉风格为**极简清新风\+商务质感**，兼顾易用性与专业性，拒绝冗余设计，聚焦求职复盘与流程管理核心需求，让用户快速切换功能、整理复盘内容，缓解求职焦虑。色彩体系以“主色：薄荷绿（\#4ECDC4）\+ 辅助色：奶白（\#F9FAFB）\+ 强调色：浅蓝（\#60A5FA）”为主，设计理由如下：

- 薄荷绿主色：传递清新、治愈的调性，缓解求职者的焦虑情绪，同时体现“成长、积累”的产品内核，契合复盘归纳、持续优化的定位；

- 奶白辅助色：作为背景底色，提升界面整洁度，突出核心内容（如复盘记录、投递进度），避免视觉干扰，长时间使用不疲劳；

- 浅蓝强调色：用于按钮、进度标记、核心操作入口及复盘重点标注，吸引用户注意力，同时传递专业、可靠的质感，适配求职场景的严肃性。

### （2）关键界面展示

#### ① 核心展示主页

效果图说明：主页采用“顶部状态栏\+左侧功能导航\+右侧主内容区”的布局，顶部显示用户求职核心数据概览（已投递岗位数、面试次数、复盘记录数、Offer数）及待办提醒（笔试时间、面试时间）；左侧导航清晰划分“简历优化、岗位匹配、投递管理、模拟面试、面试复盘、个人知识库”6大核心模块，图标简洁直观，hover时显示功能简介；右侧主内容区为“求职闭环指引”，依次展示“简历优化→岗位匹配→投递管理→模拟面试→面试复盘”的流程节点，每个节点标注当前进度，点击节点可直接跳转对应模块，同时显示近期复盘重点和高匹配度岗位推荐，凸显“闭环成长”的核心定位。

#### ② 核心功能界面（面试复盘界面）

效果图说明：界面分为上中下三部分，上部为操作入口，支持“上传录音、手动输入面试记录、导入面试问题”三种方式，按钮清晰易懂；中部为复盘处理区，左侧显示原始录音/输入内容，右侧为大模型处理后的结构化复盘结果，自动分类为“面试基本信息（公司、岗位、轮次）、面试问题、我的回答、面试官反馈、薄弱点、改进建议”，关键信息（如薄弱点、改进建议）用浅蓝强调色标注；下部为复盘保存与复用区，支持“添加至个人知识库、关联对应岗位、同步至模拟面试题库”，用户可直接点击“同步优化简历”，让复盘结果反向作用于简历优化，实现数据联动。

#### ③ 其他重要界面（投递管理界面）

效果图说明：界面采用看板式设计，左侧为流程模块自定义区，用户可添加、删除、调整求职流程节点（如待投递、已投递、待笔试、待一面等），适配不同公司的招聘流程；右侧为岗位投递列表，每个岗位以卡片形式展示，标注公司、岗位名称、匹配度、当前进度（用不同颜色标签区分：灰色=待处理、蓝色=进行中、绿色=通过、红色=未通过），卡片内可快速查看投递时间、笔试/面试时间及跟进提醒；点击卡片可展开详情，编辑进度、添加备注（如面试时间、面试官提示），同时关联该岗位的复盘记录，实现投递与复盘的无缝衔接，本质上是贴合求职场景的智能备忘录。

## 作品的交互设计

### （1）核心用户操作流程（以“面试复盘→模拟面试→简历优化”闭环为例）

选取产品最具特色的“复盘\-优化”闭环流程，用分步流程图说明，贴合用户真实求职场景，步骤如下：

1. 用户完成真实面试后，进入“面试复盘”模块，点击“上传录音”，选择面试录音文件，系统自动开始转写（显示转写进度条）；

2. 转写完成后，大模型自动清洗、归纳转写内容，生成结构化复盘结果，用户可手动补充遗漏的面试问题、面试官反馈，调整薄弱点和改进建议；

3. 用户点击复盘界面底部“同步至模拟面试”，系统自动将复盘数据（面试问题、薄弱点）同步至模拟面试模块，生成针对性的模拟面试题库；

4. 用户进入“模拟面试”模块，系统基于用户简历、目标岗位JD及刚同步的复盘数据，生成定制化虚拟面试官，用户开始模拟面试，系统实时记录回答内容；

5. 模拟面试结束后，系统给出评分和改进建议，用户点击“关联简历优化”，系统自动将模拟面试中暴露的薄弱点（如项目描述不清晰、技术细节不足）同步至简历优化模块，给出针对性修改提示；

6. 用户进入“简历优化”模块，查看系统结合复盘、模拟面试数据给出的优化建议，手动微调或点击“一键优化”，更新简历内容，完成“复盘—模拟—优化”的闭环，为下一次投递做准备。

流程图补充：每个步骤均有明确反馈（如“转写中”“复盘完成”“同步成功”“优化提示已生成”），流程衔接顺畅，突出“每一次复盘都能转化为优化动力”的核心逻辑，无需用户手动关联各模块数据。

### （2）交互设计中的创新之处

1\.  复盘数据联动交互：创新实现“面试复盘—模拟面试—简历优化”的自动联动，用户无需手动操作，复盘数据可直接同步至其他模块，例如复盘时标记的“技术薄弱点”，会自动同步到模拟面试题库和简历优化建议中，实现数据复用，让优化更具针对性，打破传统求职工具各模块孤立的痛点。

2\.  多模态复盘交互：支持“录音转写\+手动输入\+语音补充”多方式复盘，用户可上传面试录音自动转写，也可手动输入面试问题，还能通过语音补充复盘细节（如“面试官额外提到的岗位要求”）；同时，模拟面试支持语音回答和文字回答两种模式，贴合真实面试场景，语音回答可自动转写并分析表达流畅度，给出针对性建议，提升交互的便捷性和真实性。

3\.  模块化进度自定义交互：投递管理界面支持用户自定义求职流程节点，可拖拽调整节点顺序、添加专属节点（如“测评环节”“群面环节”），每个节点可设置提醒时间，系统会在对应时间推送通知，避免用户遗漏重要节点，适配不同公司、不同岗位的招聘流程差异，提升交互的灵活性。

## 大模型的具体应用说明

本作品以多模态大模型为核心，结合RAG技术构建个人求职知识库，贯穿五大模块，重点应用于复盘归纳与闭环优化，具体说明如下：

- 1\.  简历优化模块：大模型结合用户上传的简历、目标岗位方向及历史复盘数据，分析简历存在的问题（表达不专业、重点不突出等），结合用户选择的优化方向（如突出技术深度、面向校招），改写语句、优化排版、突出项目重点，生成多版本简历，避免模板化，贴合用户真实经历。

- 2\.  岗位匹配模块：大模型解析后台爬取的岗位JD，提取核心要求（专业、技能、经验等），与用户简历进行多维度语义匹配，计算量化匹配度，对岗位进行排序，同时结合用户复盘数据（如过往面试反馈的岗位适配问题），优化推荐逻辑，避免推荐与用户薄弱点不符的岗位。

- 3\.  模拟面试模块：多模态大模型基于用户简历、目标岗位JD及历史面试复盘数据，生成定制化虚拟面试官和面试问题，模拟不同面试场景；实时分析用户回答（语音/文字），从回答完整度、逻辑结构、岗位匹配度等维度评分，识别薄弱点，给出可落地的改进建议。

- 4\.  面试复盘模块：大模型负责录音转写后的内容清洗、归纳和结构化处理，自动提取面试关键信息（面试问题、薄弱点、面试官反馈等），生成标准化复盘记录，同时随着复盘数据积累，归纳用户高频薄弱点，形成个人求职知识库，为后续模块提供数据支撑。

- 5\.  全模块数据联动：大模型整合简历、投递、模拟面试、复盘全量数据，构建用户个人求职画像，实现各模块数据互通，例如将复盘发现的薄弱点反向作用于简历优化和模拟面试，让每一次复盘都能驱动用户求职能力提升，形成闭环优化。



# AI版本 第二版

## 职投 Copilot 应用功能介绍

“职投 Copilot”是一款面向应届生、实习生、校招生、转岗求职者和高频投递人群的 AI 求职辅助应用。与传统求职工具只关注“简历制作”或“岗位投递”不同，本产品的核心重点放在求职全过程的复盘、归纳和持续优化上。系统通过用户简历、岗位信息、投递记录、模拟面试表现和真实面试复盘数据，逐步构建一个专属于用户自己的求职助手，使用户在每一次投递、笔试、面试和复盘中都能积累经验，形成可复用、可迭代的个人求职知识库。

从行业趋势看，AI 已经开始广泛参与求职过程，包括岗位推荐、简历优化、申请材料生成和面试准备等环节；同时，企业端也越来越重视基于技能的招聘和筛选方式。因此，求职者不仅需要一份“好看的简历”，更需要一个能够持续整理能力证据、优化表达方式、辅助面试训练的系统化工具。

## 一、简历优化模块

简历优化模块是用户进入系统后的基础功能。用户可以上传已有简历，也可以手动填写个人信息、教育背景、项目经历、实习经历、竞赛经历、技术栈和荣誉证书等内容。系统会基于大模型对简历内容进行分析，识别其中存在的问题，例如表达不够专业、项目重点不突出、技术栈与岗位方向不匹配、经历描述缺少量化结果、排版结构混乱等。

在优化过程中，系统不会简单地替用户生成一份模板化简历，而是结合用户的真实项目经历和目标岗位方向，给出针对性的修改建议。例如，对于技术类岗位，系统会重点优化项目背景、技术方案、个人职责、实现难点、结果指标和工程价值；对于产品、运营或综合类岗位，系统会更强调用户的问题分析能力、沟通能力、组织能力和成果转化能力。

用户可以在系统中选择不同优化方向，例如“突出技术深度”“突出项目成果”“面向大厂校招”“面向国企央企”“面向实习岗位”等。大模型会根据用户选择自动调整简历语言风格和内容重点，帮助用户形成多版本简历，以适应不同岗位的投递需求。

## 二、岗位匹配与投递模块

岗位匹配与投递模块负责帮助用户从大量招聘信息中筛选出更适合自己的岗位。系统后台通过爬取或接入企业招聘官网、公开招聘页面和岗位数据库，持续维护岗位信息，包括岗位名称、公司名称、工作地点、学历要求、专业要求、技术要求、岗位职责、加分项、截止时间和招聘链接等。

系统会将用户简历与岗位 JD 进行匹配分析，从多个维度计算岗位匹配度，例如专业匹配度、技能匹配度、项目经历相关度、学历要求符合度、工作地点偏好、岗位方向一致性和竞争难度等。最终系统会以量化指标的方式对岗位进行排序，帮助用户优先关注最值得投递的岗位。

由于各大招聘平台和企业官网通常不开放统一投递接口，本产品不强行做自动投递，而是采用更稳妥的方式：在岗位详情页提供原始招聘网页跳转入口，由用户自行完成最终投递。这样既避免平台权限问题，也保证投递过程的真实性和安全性。系统重点承担“岗位发现、岗位筛选、匹配分析和投递辅助”的角色，而不是替代用户完成所有操作。

## 三、投递管理界面

投递管理界面是用户求职过程中的进度管理中心。用户在投递岗位后，可以将岗位加入个人投递看板，并手动维护当前进度。系统支持多种求职状态，例如“待投递”“已投递”“简历筛选中”“待笔试”“笔试完成”“待一面”“待二面”“HR 面”“Offer”“已拒绝”“已结束”等。

考虑到不同公司、不同岗位的招聘流程差异较大，系统采用模块化流程管理方式。用户可以根据实际情况自定义流程节点，例如部分企业可能包括测评、群面、技术面、主管面、HR 面等多个环节；部分岗位可能只有简历筛选和一次面试。用户可以灵活添加、删除或调整流程节点，使投递管理更加贴合真实求职过程。

该模块本质上是一个面向求职场景的智能备忘录。它可以帮助用户避免忘记投递时间、笔试时间、面试时间、岗位截止日期和后续跟进事项。同时，系统可以根据用户的投递记录生成阶段性统计，例如已投递岗位数量、进入笔试比例、进入面试比例、Offer 转化率、不同岗位方向的反馈情况等，为后续求职策略调整提供依据。

## 四、模拟面试模块

模拟面试模块是本产品的核心 AI 交互功能之一。系统会根据用户简历、目标岗位 JD、投递岗位类型以及历史面试复盘数据，自动生成定制化的虚拟面试官。该面试官可以模拟不同类型的面试场景，例如技术面、项目深挖面、HR 面、行为面试、压力面试、国企结构化面试等。

在模拟过程中，多模态大模型可以围绕用户简历中的项目经历进行追问，例如“你在这个项目中具体负责什么？”“这个技术方案为什么这样设计？”“项目遇到的最大困难是什么？”“如果重新做一遍，你会如何优化？”系统也可以根据岗位要求生成针对性问题，例如针对算法岗、嵌入式岗、测试岗、产品岗或运营岗生成不同问题集合。

面试结束后，系统会对用户回答进行评分和分析。评分维度可以包括回答完整度、逻辑结构、岗位匹配度、技术表达清晰度、项目理解深度、STAR 法则使用情况、语言流畅度和抗压表现等。系统会指出用户回答中的问题，例如表达太空泛、缺少数据支撑、项目贡献不明确、技术细节不足、回答结构混乱等，并给出可修改的参考答案。

这个模块的价值不只是“练题”，而是帮助用户提前暴露真实面试中可能出现的问题。尤其是在当前招聘流程中，部分企业已经使用 AI 面试或预录制视频面试，求职者经常面临缺少互动、缺少反馈、表达不自然的问题。因此，系统提供可反复练习、可复盘、可改进的模拟面试环境，能有效降低用户面对正式面试时的不确定性。

## 五、面试复盘模块

面试复盘模块是本产品区别于普通求职工具的关键创新点。用户在完成真实面试后，可以上传面试录音、手动输入面试问题，或者整理自己的回忆记录。系统会先将录音转写为文字，再利用大模型对面试内容进行清洗、归纳和结构化处理。

系统会自动提取面试中的关键信息，例如公司名称、岗位名称、面试轮次、面试官关注点、被问到的问题、用户回答内容、回答不足之处、面试官追问方向、用户卡壳点、技术薄弱点和后续改进建议。整理后的内容会以结构化形式保存到个人求职知识库中。

随着用户面试次数增加，系统会逐渐形成用户自己的面试经验库。例如，系统可以发现用户经常在“项目难点”“技术原理”“自我介绍”“职业规划”“反问环节”等问题上表现不稳定，也可以总结不同公司、不同岗位对用户能力的关注差异。之后，在用户进行下一次模拟面试或简历优化时，系统会自动调用这些历史复盘数据，生成更贴合用户真实短板的训练内容。

因此，面试复盘模块不是简单的录音转文字工具，而是一个“经验沉淀系统”。它把用户每一次真实面试都转化为后续求职的训练材料，使求职过程从一次性消耗变成持续积累。

## 六、整体使用流程

用户首先上传简历或填写个人档案，系统对简历进行结构化解析和优化，形成适合不同岗位方向的简历版本。随后，系统从岗位数据库中筛选与用户能力匹配的岗位，并给出量化推荐结果。用户选择岗位后，可以跳转到企业招聘官网完成投递，并在投递管理界面维护进度。

当用户进入笔试或面试阶段后，可以使用模拟面试模块进行针对性训练。正式面试结束后，用户上传录音或输入面试记录，系统自动完成转写、清洗、归纳和知识沉淀。沉淀后的复盘数据会反向作用于简历优化、岗位推荐和下一轮模拟面试，使整个系统形成“简历优化—岗位匹配—投递管理—模拟面试—真实复盘—再次优化”的闭环。

## 七、应用创新点

本产品的第一项创新是从“投递工具”转向“求职成长助手”。传统工具更关注简历模板、岗位搜索或投递记录，而职投 Copilot 更关注用户在求职过程中的能力积累和经验复盘。

第二项创新是构建个人求职知识库。系统不仅保存用户简历，还保存用户的面试问题、回答表现、失败原因、改进建议和岗位反馈，使用户的每一次求职经历都能被沉淀和复用。

第三项创新是实现多模块数据联动。简历优化、岗位匹配、模拟面试和面试复盘不是孤立功能，而是共享同一套用户画像和求职数据。系统可以根据用户历史面试暴露的问题，反向优化简历表达和模拟面试问题。

第四项创新是降低自动投递风险。产品不强行绕过招聘平台限制，而是通过岗位推荐和官网跳转辅助用户完成投递，兼顾实用性、合规性和可落地性。

第五项创新是面向真实求职闭环设计。系统不是只在投递前发挥作用，而是覆盖投递前、投递中、面试前、面试后和下一轮优化全过程，真正帮助用户提升求职成功率。

## 八、应用价值

对于应届生和实习生，职投 Copilot 可以帮助他们把零散的项目经历、课程经历和竞赛经历整理成更专业的简历内容，并通过模拟面试提升表达能力。

对于转岗求职者，系统可以帮助他们分析已有经历与目标岗位之间的差距，优化简历表达方式，并推荐更适合的岗位方向。

对于海投用户，系统可以承担岗位筛选、投递记录管理和面试复盘整理工作，减少重复劳动，降低遗漏重要节点的风险。

对于缺少求职经验的用户，系统可以通过持续复盘让他们知道自己每一次失败在哪里、下一次应该如何改进，而不是盲目继续投递。

总体来看，职投 Copilot 的定位不是“替用户找工作”，而是帮助用户把求职过程变得更清晰、更可控、更可复盘。它通过大模型、多模态交互、岗位匹配算法、语音转写和结构化知识库等技术，构建一个围绕用户个人成长的 AI 求职助手。最终目标是让用户从被动投递转向主动优化，从零散经验转向系统积累，从单次面试准备转向长期能力提升。

# VIVO复赛会议

创新设计

Design Thinking

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGJmZjg2OWU4ODdiMTIzMmQyNWUxMTg5ZDMxNDJjNWNfZWE3ZWU3MjZhNDYwNjZiMTQ5YjM3ZDVlZDgzZWY4NTZfSUQ6NzY0NDg5NjkyMTY4OTM2MTYyNV8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

### 打出差异化

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MWJlMjU0NTk1MjExNjk1ZjFiNjRlM2UwZjUyODBiZmVfNjI4ZGNjODBhNDY1MWE5ZGI0YjkwODVmZThjYjM4NjdfSUQ6NzY0NDg5OTQ0MTMwMDMyNzYwOV8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTE2ZmI4MDhjZWU5OWY5NDcwZWVlOTA2ZDVjYTU5YTJfYzFjYjY0Zjg4NTAzMTFlZmYwYTdkZTA2MmM3NGQ1MThfSUQ6NzY0NDg5OTc2MTgwNzc4OTAwM18xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

交互简洁、**无关功能要优化，有聚焦点，有惊喜感（动效、特效），核心流程清晰呈现**

## 产品定位

定位准确（目标人群），不能太杂太乱（展现核心功能，降低用户上手成本），定性定量分析

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MmI4MWIyNGNjMTBjYzBmNDRlZDUyMGI2MDViN2UzMjlfMjUxZmI3ZjZmYTdhZDcxYzQyOGFhYTM1MTdjM2RlMWZfSUQ6NzY0NDkwMTAzNzkxMjE4MTY5Nl8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## 其他建议

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NzE2YjU2NDgwYjY5MjQ2MTI5MjhiYzY3ZjFlMDhkYmRfZWU5ZWE4NzU2MjEyYzZiNjNkZDBjYzExOTMxZjU4OWJfSUQ6NzY0NDkwMTQ1OTkyMjAyOTQ5OF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## AI设计辅助

pm\-skiller辅助产品分析

AI生成Demo

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDI5ZWZmMzdkYWYwZmQyZWMxZTVkYzc3YTI5NGNhMjlfNWNmODY3NmM5Y2JmNzM2ZGFhNDRjNjk3MTZkYmNjZGRfSUQ6NzY0NDkwMTk4MzA0MzgxNjM5OF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## 总体环节

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZmJlMDgzODg2MWIwZDRlMTk4ZGY4YzE3N2UwNTgzMjNfY2MyNzBiYjRhMDQ5OGViZDIzNmMyYWM4ZDk0YjVjZTFfSUQ6NzY0NDkwMjExMzA1NDk1MjM3Nl8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## 晋级比例

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MjM2MTE4MDZiM2I1OWIzNmI0MDY0OTU1YWM0Nzk2NDVfNWZjOWQ3ZjNhZWRjZGI3NTA4YTc5NTQ3NmRlZTNiMThfSUQ6NzY0NDkwMjg0MjM2MDU4MTM0MF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZmQ3YzMwMGMwNzk3NzFmNzhmM2EyNjc5YWMzMDZmMDFfMDYwMTVhODIyZjY5NzMxNDBjMDQ1ODgzMmMwZWQ0MWJfSUQ6NzY0NDkwMzQ3MzcxNjYyODY2OF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## 提交清单

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NWU1YmZmN2RmN2QxYjA0NjY0MTYyZWEzZTgyMGYyYTdfNGYxYWMzNjRhNjBhNTk5OTM2MDJkYWNmMDQ2MjNjOGZfSUQ6NzY0NDkwMzcxOTg1OTM0MjU1MF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## 云真机

ADB调试

Andriod studio做调试连接

## 端侧大模型

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=M2JjYzNlYzg3MTkzOGYyNTE3MDFkN2JhMjJkNjY4MTlfNjA1OTc3M2FjZWEzZmRiYjdmOTA0MzllNDRjYWI1OTFfSUQ6NzY0NDkxMTUxMzk5NTY5MzIzNl8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTIxNWM1ZThlNjQ0NzZjN2FiNzVkNTI1NThlYWM5ZDNfY2I0NzNmMWMxMmE0M2FiZWEzOTU2YWIzZWM2Y2I1MDZfSUQ6NzY0NDkxMjQzMzUxNzE2OTg2OF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTkyMTg0YTAzNDhhOTAzZGJlYmFiY2RmODZmZTBlODJfZGI5OWNmYTkxYjkzZjhiNmNjM2FhZTY2NjVjMzFmMjhfSUQ6NzY0NDkxMjgwMzkwMzU3Mjk1MF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=N2VjZTIwOThiOGQzMGMxZTIzMjM3OTFiNjk0ZmQ4OTBfNzQzZTE1NWE3MTAyYmYwYjJjYzFjOGI4ODNhMTczYWJfSUQ6NzY0NDkxMzE2MTQwNTMwMzczOV8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

#### 复赛不能微调模型，那么可以改prompt吗？？



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZWY0ZWQ1N2M5Yzc3NzM5ZTk3NGJhMzkyNTdlNmY3NTdfZjE5NWM1MmY2YzZmNzgzZGI4ZTU1MzlhZjc0YzJlZjRfSUQ6NzY0NDkxMzQ2NzY2MDQ4NzYyOF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTRjZWU1YzY3ODdjNGM0YjY3Njk4MDQ1ZGRmYTk2YzVfYzAxZTFlOGU0NTFhYmE5ZGUzOWU0YTY3ZTFiZmUyN2FfSUQ6NzY0NDkxMzc5MDgyMzU5OTA0Ml8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

### 案例讲解

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NmIyNmFiMGFkNWFjNTg5NWI0ZDNiN2IyNzFiY2IwYjlfMTc5ZTc2ZTg0ZDQ5ZjcwMWM0Yzk0NjJjZGM2ODNmMzhfSUQ6NzY0NDkxNDQ1MjAwNTE3ODMzN18xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjMzOTljODU1NDE3MjU4NmIyYmJkNTFkNTRjYmQzMDRfMjE3ODQ4NWM2Nzc0ZDJjMjcwYjNjNzkwMDY1YjRhN2NfSUQ6NzY0NDkxNDk4Mjg3MDI3MzIxMF8xNzgwNDAyODkxOjE3ODA0ODkyOTFfVjM)

## 开发计划



