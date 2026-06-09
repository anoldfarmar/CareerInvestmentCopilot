⚡ Agent 轻量解析 API
免登录，无需 Token，IP 限频防滥用。专为 OpenClaw 等 AI Agent 场景设计，仅输出 Markdown，免登录零门槛。

概述
Agent 轻量解析接口专为 OpenClaw 等 AI Agent 场景设计，提供快速、免登录的文档解析能力。

核心特性：

无需登录：通过 IP 限频防滥用，无需申请 Token
轻量快速：PDF、图片使用 pipeline 轻量模型，禁用表格/公式识别，追求最快解析速度; Word、PPT使用Office原生API解析
统一输出：仅输出 Markdown 格式，返回 CDN 链接
双模式提交：URL 解析和文件上传为独立接口，文件上传采用签名上传模式
文件限制：

限制项	限制值
文件大小上限	10 MB
文件页数上限	20 页
支持文件类型	PDF、图片（png/jpg/jpeg/jp2/webp/gif/bmp）、Docx、PPTx、Xlsx
IP 限频：

每 IP 每分钟提交请求数有限制
超出限制将返回 HTTP 429 状态码
1. URL 解析接口
接口说明

提交一个远程文件 URL 进行解析。后端自动下载并解析文件。

接口为异步返回模式，提交成功后返回 task_id，需通过查询接口轮询结果。

请求地址

POST https://mineru.net/api/v1/agent/parse/url
请求体参数说明（JSON）

参数	类型	是否必选	说明
url	string	必填	远程文件 URL，支持 PDF、图片、Doc/Docx、PPT/PPTx、Xlsx 格式。不支持 HTML。
file_name	string	可选	文件名（含扩展名），用于判断文件类型。若不提供则从 URL 自动解析。
language	string	可选	解析语言，影响 OCR 识别效果。默认 ch。可选值见 language 取值参考。仅对 PDF 文件生效
enable_table	bool	可选	是否开启表格识别。默认 true。仅对 PDF 文件生效
is_ocr	bool	可选	是否开启 OCR。默认 false。仅对 PDF 文件生效
enable_formula	bool	可选	是否开启公式识别。默认 true。仅对 PDF 文件生效
page_range	string	可选	页码范围，仅对 PDF 有效。支持 from-to（如 1-10）或单个页码（如 5），不支持逗号分隔的复杂格式。
注意：

无需 Authorization 请求头
请求体为 JSON 格式（Content-Type: application/json），不支持 multipart/form-data
Python 请求示例

import requests

url = "https://mineru.net/api/v1/agent/parse/url"

data = {
    "url": "https://cdn-mineru.openxlab.org.cn/demo/example.pdf",
    "language": "ch",
    "page_range": "1-10",
    "enable_table": True,
    "is_ocr": False,
    "enable_formula": True
}

res = requests.post(url, json=data)
print(res.json())
CURL 请求示例

curl --location --request POST 'https://mineru.net/api/v1/agent/parse/url' \
--header 'Content-Type: application/json' \
--data-raw '{
    "url": "https://cdn-mineru.openxlab.org.cn/demo/example.pdf",
    "language": "ch",
    "page_range": "1-10",
    "enable_table": true,
    "is_ocr": false,
    "enable_formula": true
}'
响应参数说明

参数	类型	示例	说明
code	int	0	接口状态码，成功：0
msg	string	ok	接口处理信息，成功："ok"
trace_id	string	c876cd60b202f2396de1f9e39a1b0172	请求 ID
data.task_id	string	a90e6ab6-44f3-4554-b459-b62fe4c6b43605	解析任务 ID，用于查询任务结果。
响应示例

{
  "code": 0,
  "data": {
    "task_id": "a90e6ab6-44f3-4554-b459-b62fe4c6b43605"
  },
  "msg": "ok",
  "trace_id": "c876cd60b202f2396de1f9e39a1b0172"
}
2. 本地文件上传接口（签名上传）
接口说明

提交一个文件上传解析任务。接口采用签名上传模式：

调用本接口，传入文件名等参数，获取 task_id、OSS 签名上传 URL（file_url）
客户端使用 PUT 方法将文件直接上传到 file_url
上传完成后，后端自动检测并开始解析
通过查询接口轮询解析结果
请求地址

POST https://mineru.net/api/v1/agent/parse/file
请求体参数说明（JSON）

参数	类型	是否必选	说明
file_name	string	必填	文件名（含扩展名），用于判断文件类型。
language	string	可选	解析语言，影响 OCR 识别效果。默认 ch。可选值见 language 取值参考。仅对 PDF 文件生效
enable_table	bool	可选	是否开启表格识别。默认 true。仅对 PDF 文件生效
is_ocr	bool	可选	是否开启 OCR。默认 false。仅对 PDF 文件生效
enable_formula	bool	可选	是否开启公式识别。默认 true。仅对 PDF 文件生效
page_range	string	可选	页码范围，仅对 PDF 有效。支持 from-to（如 1-10）或单个页码（如 5），不支持逗号分隔的复杂格式。
注意：

无需 Authorization 请求头
请求体为 JSON 格式（application/json）
不支持批量上传，每次请求只能上传一个文件
响应参数说明

参数	类型	示例	说明
code	int	0	接口状态码，成功：0
msg	string	ok	接口处理信息，成功："ok"
trace_id	string	c876cd60b202f2396de1f9e39a1b0172	请求 ID
data.task_id	string	a90e6ab6-44f3-4554-b459-b62fe4c6b43605	解析任务 ID，用于查询任务结果。
data.file_url	string	https://oss-mineru.../agent/a90e6ab6-...pdf	OSS 签名上传 URL，客户端 PUT 上传文件到此地址
响应示例

{
  "code": 0,
  "data": {
    "task_id": "a90e6ab6-44f3-4554-b459-b62fe4c6b43605",
    "file_url": "https://oss-mineru.openxlab.org.cn/agent/a90e6ab6-...pdf?Expires=..."
  },
  "msg": "ok",
  "trace_id": "c876cd60b202f2396de1f9e39a1b0172"
}
Python 请求示例（完整签名上传流程）

import requests

# 第一步：获取签名上传 URL
api_url = "https://mineru.net/api/v1/agent/parse/file"
data = {
    "file_name": "document.pdf",
    "language": "ch",
    "page_range": "1-10",
    "enable_table": True,
    "is_ocr": False,
    "enable_formula": True
}

res = requests.post(api_url, json=data)
result = res.json()
task_id = result["data"]["task_id"]
file_url = result["data"]["file_url"]

print(f"任务已创建, task_id: {task_id}")

# 第二步：PUT 上传文件到 OSS
with open("document.pdf", "rb") as f:
    put_res = requests.put(file_url, data=f)
    print(f"文件上传状态: {put_res.status_code}")
CURL 请求示例

# 第一步：获取签名上传 URL
curl --location --request POST 'https://mineru.net/api/v1/agent/parse/file' \
--header 'Content-Type: application/json' \
--data-raw '{
    "file_name": "document.pdf",
    "language": "ch",
    "page_range": "1-10",
    "enable_table": true,
    "is_ocr": false,
    "enable_formula": true
}'

# 第二步：PUT 上传文件到返回的 file_url
curl --location --request PUT '<file_url>' \
--data-binary '@document.pdf'
3. 查询解析结果
接口说明

通过 task_id 查询解析任务的状态和结果。任务处理完成后，响应中包含 Markdown 结果文件的 CDN 下载链接。

请求地址

GET https://mineru.net/api/v1/agent/parse/{task_id}
Python 请求示例

import requests

task_id = "a90e6ab6-44f3-4554-b459-b62fe4c6b43605"
url = f"https://mineru.net/api/v1/agent/parse/{task_id}"

res = requests.get(url)
print(res.json())
CURL 请求示例

curl --location --request GET 'https://mineru.net/api/v1/agent/parse/{task_id}'
响应参数说明

参数	类型	示例	说明
code	int	0	接口状态码，成功：0
msg	string	ok	接口处理信息，成功："ok"
trace_id	string	c876cd60b202f2396de1f9e39a1b0172	请求 ID
data.task_id	string	a90e6ab6-...05	任务 ID（与提交时返回的一致）
data.state	string	done	任务状态：waiting-file（等待文件上传，仅文件上传模式）、uploading(文件下载中)、pending（排队中）、running（解析中）、done（完成）、failed（失败）
data.markdown_url	string	https://cdn-mineru.../full.md	Markdown 结果文件的 CDN 下载链接，当 state=done 时有效
data.err_msg	string	file page count exceeds lightweight API limit	错误信息，当 state=failed 时有效
data.err_code	int	-30003	错误码，当 state=failed 时有效。详见底部错误码表
响应示例（等待文件上传 — 仅文件上传模式）

{
  "code": 0,
  "data": {
    "task_id": "a90e6ab6-44f3-4554-b459-b62fe4c6b43605",
    "state": "waiting-file"
  },
  "msg": "ok",
  "trace_id": "c876cd60b202f2396de1f9e39a1b0172"
}
响应示例（处理中）

{
  "code": 0,
  "data": {
    "task_id": "a90e6ab6-44f3-4554-b459-b62fe4c6b43605",
    "state": "running"
  },
  "msg": "ok",
  "trace_id": "c876cd60b202f2396de1f9e39a1b0172"
}
响应示例（完成）

{
  "code": 0,
  "data": {
    "task_id": "a90e6ab6-44f3-4554-b459-b62fe4c6b43605",
    "state": "done",
    "markdown_url": "https://cdn-mineru.openxlab.org.cn/pdf/a90e6ab6-.../full.md"
  },
  "msg": "ok",
  "trace_id": "c876cd60b202f2396de1f9e39a1b0172"
}
响应示例（失败）

{
  "code": 0,
  "data": {
    "task_id": "a90e6ab6-44f3-4554-b459-b62fe4c6b43605",
    "state": "failed",
    "err_code": -30003,
    "err_msg": "file page count exceeds lightweight API limit (50 pages), please use the standard API"
  },
  "msg": "ok",
  "trace_id": "c876cd60b202f2396de1f9e39a1b0172"
}
完整使用示例（Python）
URL 模式

def parse_by_url(url, language="ch", page_range=None, enable_table=True, is_ocr=False, enable_formula=True):
    """通过 URL 提交文档解析任务并等待结果。"""
    # 1. 提交 URL 解析任务
    data = {"url": url, "language": language, "enable_table": enable_table, "is_ocr": is_ocr, "enable_formula": enable_formula}
    if page_range:
        data["page_range"] = page_range

    resp = requests.post(f"{BASE_URL}/parse/url", json=data)
    result = resp.json()
    if result["code"] != 0:
        print(f"提交失败: {result['msg']}")
        return None

    task_id = result["data"]["task_id"]
    print(f"任务已提交, task_id: {task_id}")

    # 2. 轮询等待结果
    return poll_result(task_id)


def poll_result(task_id, timeout=300, interval=3):
    """轮询查询解析结果。"""
    state_labels = {
        "uploading": "文件下载中",
        "pending": "排队中",
        "running": "解析中",
        "waiting-file": "等待文件上传",
    }
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(f"{BASE_URL}/parse/{task_id}")
        result = resp.json()
        state = result["data"]["state"]
        elapsed = int(time.time() - start)

        if state == "done":
            markdown_url = result["data"]["markdown_url"]
            print(f"[{elapsed}s] 解析完成, Markdown 下载链接: {markdown_url}")
            md_resp = requests.get(markdown_url)
            return md_resp.text

        if state == "failed":
            print(f"[{elapsed}s] 解析失败: {result['data'].get('err_msg', '未知错误')}")
            return None

        print(f"[{elapsed}s] {state_labels.get(state, state)}...")
        time.sleep(interval)

    print(f"轮询超时 ({timeout}s)，请稍后手动查询 task_id: {task_id}")
    return None


# 使用示例
content = parse_by_url("https://cdn-mineru.openxlab.org.cn/demo/example.pdf")
文件上传模式（签名上传）

import requests
import time

BASE_URL = "https://mineru.net/api/v1/agent"

def parse_by_file(file_path, language="ch", page_range=None, enable_table=True, is_ocr=False, enable_formula=True):
    """通过文件上传提交文档解析任务并等待结果。"""
    file_name = file_path.split("/")[-1].split("\\")[-1]

    # 1. 获取签名上传 URL
    data = {"file_name": file_name, "language": language, "enable_table": enable_table, "is_ocr": is_ocr, "enable_formula": enable_formula}
    if page_range:
        data["page_range"] = page_range

    resp = requests.post(f"{BASE_URL}/parse/file", json=data)
    result = resp.json()
    if result["code"] != 0:
        print(f"获取上传链接失败: {result['msg']}")
        return None

    task_id = result["data"]["task_id"]
    file_url = result["data"]["file_url"]
    print(f"任务已创建, task_id: {task_id}")

    # 2. PUT 上传文件到 OSS
    with open(file_path, "rb") as f:
        put_resp = requests.put(file_url, data=f)
        if put_resp.status_code not in (200, 201):
            print(f"文件上传失败, HTTP {put_resp.status_code}")
            return None
    print("文件上传成功，等待解析...")

    # 3. 轮询等待结果
    return poll_result(task_id)


def poll_result(task_id, timeout=300, interval=3):
    """轮询查询解析结果。"""
    state_labels = {
        "pending": "排队中",
        "running": "解析中",
        "waiting-file": "等待文件上传",
    }
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(f"{BASE_URL}/parse/{task_id}")
        result = resp.json()
        state = result["data"]["state"]
        elapsed = int(time.time() - start)

        if state == "done":
            markdown_url = result["data"]["markdown_url"]
            print(f"[{elapsed}s] 解析完成, Markdown 下载链接: {markdown_url}")
            md_resp = requests.get(markdown_url)
            return md_resp.text

        if state == "failed":
            print(f"[{elapsed}s] 解析失败: {result['data'].get('err_msg', '未知错误')}")
            return None

        print(f"[{elapsed}s] {state_labels.get(state, state)}...")
        time.sleep(interval)

    print(f"轮询超时 ({timeout}s)，请稍后手动查询 task_id: {task_id}")
    return None


# 使用示例
content = parse_by_file("./document.pdf")
Agent 专属错误码
错误码	说明	Agent 应对策略
-30001	文件大小超出轻量接口限制（10MB）	请使用标准 API 或拆分文件
-30002	轻量接口不支持该文件类型	请上传 PDF/图片/Doc/PPT/Excel
-30003	文件页数超出轻量接口限制	请使用标准 API 或指定 page_range
-30004	请求参数错误	检查必填参数是否缺失
language 取值参考
language 字段建议按下表传入。默认值为 ch。

Standalone language packs
Value	Included languages	说明
ch	Chinese, English, Chinese Traditional	中英文（默认值）
ch_server	Chinese, English, Chinese Traditional, Japanese	繁体、手写体
en	English	纯英文
japan	Chinese, English, Chinese Traditional, Japanese	日文为主
korean	Korean, English	韩文
chinese_cht	Chinese, English, Chinese Traditional, Japanese	繁体中文为主
ta	Tamil, English	泰米尔文
te	Telugu, English	泰卢固文
ka	Kannada	卡纳达文
el	Greek, English	希腊文
th	Thai, English	泰文
Language family packs
Value	Script/Family	Included languages
latin	Latin script (拉丁语系)	French, German, Afrikaans, Italian, Spanish, Bosnian, Portuguese, Czech, Welsh, Danish, Estonian, Irish, Croatian, Uzbek, Hungarian, Serbian (Latin), Indonesian, Occitan, Icelandic, Lithuanian, Maori, Malay, Dutch, Norwegian, Polish, Slovak, Slovenian, Albanian, Swedish, Swahili, Tagalog, Turkish, Latin, Azerbaijani, Kurdish, Latvian, Maltese, Pali, Romanian, Vietnamese, Finnish, Basque, Galician, Luxembourgish, Romansh, Catalan, Quechua
arabic	Arabic script (阿拉伯语系)	Arabic, Persian, Uyghur, Urdu, Pashto, Kurdish, Sindhi, Balochi, English
cyrillic	Cyrillic script (西里尔语系)	Russian, Belarusian, Ukrainian, Serbian (Cyrillic), Bulgarian, Mongolian, Abkhazian, Adyghe, Kabardian, Avar, Dargin, Ingush, Chechen, Lak, Lezgin, Tabasaran, Kazakh, Kyrgyz, Tajik, Macedonian, Tatar, Chuvash, Bashkir, Malian, Moldovan, Udmurt, Komi, Ossetian, Buryat, Kalmyk, Tuvan, Sakha, Karakalpak, English
east_slavic	East Slavic (东斯拉夫语系)	Russian, Belarusian, Ukrainian, English
devanagari	Devanagari script (天城文语系)	Hindi, Marathi, Nepali, Bihari, Maithili, Angika, Bhojpuri, Magahi, Santali, Newari, Konkani, Sanskrit, Haryanvi, English