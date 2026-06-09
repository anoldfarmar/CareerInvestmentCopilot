import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ProgressBar, Selector, TextArea, Toast } from "antd-mobile";
import axios from "axios";
import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ResumeScoreRing } from "@/components/resume/ResumeScoreRing/ResumeScoreRing";
import { StructuredResumePreview } from "@/components/resume/StructuredResumePreview/StructuredResumePreview";
import { isResumeParsingStatus } from "@/features/resume/api";
import { useParseResume, useResumeParseStatus, useResumes, useStructureResume } from "@/features/resume/hooks";
import type { BackendResume, ResumeOptimizeFormValues } from "@/features/resume/types";
import { useResumeStore } from "@/stores/resumeStore";
import { useAuthStore } from "@/stores/authStore";
import { formatFileSize } from "@/utils/format";
import { validateResumeFile } from "@/utils/file";
import { resumeOptimizeSchema } from "@/utils/validators";

const jobOptions = ["产品经理", "前端开发", "后端开发", "数据分析", "运营", "市场", "设计", "算法", "其他"].map(
  (item) => ({ label: item, value: item }),
);

export function ResumeOptimizePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const currentResumeId = useResumeStore((state) => state.currentResumeId);
  const setCurrentResumeId = useResumeStore((state) => state.setCurrentResumeId);
  const parseMutation = useParseResume();
  const structureMutation = useStructureResume();
  const resumesQuery = useResumes(Boolean(token));
  const [progress, setProgress] = useState(0);
  const [parsedResume, setParsedResume] = useState<BackendResume>();
  const [isDragging, setIsDragging] = useState(false);
  const recoveryQuery = useResumeParseStatus(
    parsedResume?.id,
    Boolean(parsedResume && isResumeParsingStatus(parsedResume.parseStatus) && !parseMutation.isPending),
  );
  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<ResumeOptimizeFormValues>({
    resolver: zodResolver(resumeOptimizeSchema),
    defaultValues: { jobDirection: "", jobDescription: "" },
  });

  const file = watch("resumeFile");

  // 重新进入页面时，优先恢复仍在解析的任务；没有运行中任务时再选中最近使用的简历。
  useEffect(() => {
    if (parsedResume || !resumesQuery.data?.length) return;

    const recentResumeId = Number(currentResumeId);
    const resume =
      resumesQuery.data.find((item) => isResumeParsingStatus(item.parseStatus)) ??
      resumesQuery.data.find((item) => item.id === recentResumeId);

    if (resume) {
      setParsedResume(resume);
      setProgress(isResumeParsingStatus(resume.parseStatus) ? 65 : 100);
    }
  }, [currentResumeId, parsedResume, resumesQuery.data]);

  // 恢复轮询拿到新结果后，同步更新页面。任务完成时 Markdown 已由后端保存到数据库。
  useEffect(() => {
    const resume = recoveryQuery.data;
    if (!resume) return;

    setParsedResume(resume);
    setProgress(resume.parseStatus === "done" ? 100 : 65);

    if (resume.parseStatus === "done") {
      setCurrentResumeId(String(resume.id));
      Toast.show("简历解析已恢复完成，Markdown 已保存");
    }
  }, [recoveryQuery.data, setCurrentResumeId]);

  function openFilePicker() {
    if (!token) {
      navigate(`${routePaths.auth}?redirect=${encodeURIComponent(routePaths.resumeOptimize)}`);
      return;
    }

    inputRef.current?.click();
  }

  function acceptResumeFile(nextFile?: File) {
    if (!nextFile) return;
    const message = validateResumeFile(nextFile);
    if (message) {
      Toast.show(message);
      return;
    }
    setValue("resumeFile", nextFile, { shouldValidate: true });
    setProgress(100);
    Toast.show("简历已选择，分析前请确认内容不含无关隐私");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    acceptResumeFile(event.target.files?.[0]);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!token) {
      navigate(`${routePaths.auth}?redirect=${encodeURIComponent(routePaths.resumeOptimize)}`);
      return;
    }
    acceptResumeFile(event.dataTransfer.files?.[0]);
  }

  async function onSubmit(values: ResumeOptimizeFormValues) {
    if (!token) {
      navigate(`${routePaths.auth}?redirect=${encodeURIComponent(routePaths.resumeOptimize)}`);
      return;
    }

    try {
      setProgress(15);
      const resume = await parseMutation.mutateAsync({
        file: values.resumeFile,
        onStatusChange: (nextResume) => {
          setParsedResume(nextResume);
          setProgress(nextResume.parseStatus === "done" ? 100 : 65);
        },
      });
      setParsedResume(resume);
      setCurrentResumeId(String(resume.id));
      Toast.show("简历解析完成，Markdown 已保存");
    } catch (error) {
      setProgress(0);
      Toast.show(error instanceof Error ? error.message : "简历解析失败，请稍后重试");
    }
  }

  const loading = parseMutation.isPending;

  async function handleStructureResume() {
    if (!parsedResume) return;

    try {
      const resume = await structureMutation.mutateAsync(parsedResume.id);
      setParsedResume(resume);
      Toast.show("简历结构化完成");
    } catch (error) {
      // 后端会返回 DeepSeek 或 DTO 校验的具体原因，联调阶段直接展示便于定位。
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? (error.code === "ECONNABORTED" ? "结构化等待超时，请稍后重试" : error.message)
        : "简历结构化失败，请稍后重试";
      Toast.show(message);
    }
  }

  return (
    <AppShell title="简历优化" showBack showTabBar={false}>
      <form className="page-stack" onSubmit={handleSubmit(onSubmit)}>
        {!token ? (
          <section className="card page-stack">
            <strong>登录后上传简历</strong>
            <p className="muted" style={{ margin: 0 }}>
              登录后，简历会安全绑定到你的账号。
            </p>
            <Button
              block
              color="primary"
              type="button"
              onClick={() => navigate(`${routePaths.auth}?redirect=${encodeURIComponent(routePaths.resumeOptimize)}`)}
            >
              登录或注册
            </Button>
          </section>
        ) : null}

        <section className="card page-stack">
          <div className="row">
            <div>
              <strong>上传简历</strong>
              <p className="muted" style={{ margin: "5px 0 0" }}>
                支持 PDF / DOCX，最大 10MB
              </p>
            </div>
            <UploadCloud color="var(--color-primary)" />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <div
            className={`resume-dropzone${isDragging ? " resume-dropzone--active" : ""}${!token ? " resume-dropzone--disabled" : ""}`}
            role="button"
            tabIndex={token ? 0 : -1}
            aria-label="拖拽或选择简历文件"
            onClick={openFilePicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") openFilePicker();
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (token) setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <UploadCloud size={30} color="var(--color-primary)" />
            <strong>{isDragging ? "松开鼠标上传简历" : "拖拽简历到这里"}</strong>
            <span className="muted">或者点击选择 PDF / DOCX 文件</span>
          </div>
          <Button block fill="outline" disabled={!token} onClick={openFilePicker}>
            {file ? "重新选择文件" : "选择文件"}
          </Button>
          {file ? (
            <p className="muted" style={{ margin: 0 }}>
              {file.name} · {formatFileSize(file.size)}
            </p>
          ) : null}
          {errors.resumeFile ? <p className="muted" style={{ color: "var(--color-danger)" }}>{errors.resumeFile.message}</p> : null}
          {progress > 0 ? <ProgressBar percent={progress} /> : null}
        </section>

        <section className="card page-stack">
          <strong>目标岗位</strong>
          <Selector
            multiple={false}
            options={jobOptions}
            onChange={(value) => setValue("jobDirection", value[0] ?? "", { shouldValidate: true })}
          />
        </section>

        <section className="card page-stack">
          <strong>岗位 JD</strong>
          <TextArea
            rows={5}
            maxLength={800}
            placeholder="粘贴目标岗位 JD，系统将提取职责、能力要求和关键词"
            onChange={(value) => setValue("jobDescription", value, { shouldValidate: true })}
          />
          {errors.jobDescription ? (
            <p className="muted" style={{ color: "var(--color-danger)" }}>{errors.jobDescription.message}</p>
          ) : null}
        </section>

        <section className="card">
          <div className="row">
            <ResumeScoreRing score={82} size={104} label="预估得分" />
            <div className="page-stack" style={{ gap: 8 }}>
              {["简历完整度", "关键词匹配度", "内容表达质量", "ATS 友好度"].map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <Button block color="primary" type="submit" loading={loading} disabled={!token}>
          上传并解析
        </Button>

        {parsedResume ? (
          <section className="card page-stack">
            <div className="row">
              <strong>解析状态</strong>
              <span className="pill">{parsedResume.parseStatus}</span>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              简历 #{parsedResume.id} · {parsedResume.title}
            </p>
            {parsedResume.originalContent ? (
              <>
                <pre
                  style={{
                    maxHeight: 320,
                    margin: 0,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  {parsedResume.originalContent}
                </pre>
                <Button
                  block
                  color="primary"
                  type="button"
                  loading={structureMutation.isPending}
                  onClick={() => void handleStructureResume()}
                >
                  {parsedResume.structuredContent ? "重新结构化" : "一键结构化"}
                </Button>
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                MinerU 正在解析。离开页面后重新进入，系统会自动恢复进度查询。
              </p>
            )}
          </section>
        ) : null}

        {parsedResume?.structuredContent ? <StructuredResumePreview resume={parsedResume.structuredContent} /> : null}

        <section className="card page-stack">
          <strong>已有简历</strong>
          {resumesQuery.isLoading ? <p className="muted">正在加载简历列表...</p> : null}
          {resumesQuery.isError ? <p className="muted">简历列表加载失败，请确认后端已启动。</p> : null}
          {resumesQuery.data?.length === 0 ? <p className="muted">还没有简历记录。</p> : null}
          {resumesQuery.data?.map((resume) => (
            <button
              key={resume.id}
              type="button"
              className="card"
              style={{ textAlign: "left", boxShadow: "none" }}
              onClick={() => setParsedResume(resume)}
            >
              <div className="row">
                <strong>{resume.title}</strong>
                <span className="pill">{resume.parseStatus}</span>
              </div>
              <p className="muted" style={{ marginBottom: 0 }}>
                简历 #{resume.id}
              </p>
            </button>
          ))}
        </section>
      </form>
    </AppShell>
  );
}
