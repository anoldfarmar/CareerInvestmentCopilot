import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, Popup, ProgressBar, Selector, TextArea, Toast } from "antd-mobile";
import axios from "axios";
import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { MarkdownPreview } from "@/components/common/MarkdownPreview/MarkdownPreview";
import { OptimizedResumeEditor } from "@/components/resume/OptimizedResumeEditor/OptimizedResumeEditor";
import { OptimizedResumePreview } from "@/components/resume/OptimizedResumePreview/OptimizedResumePreview";
import { ResumeScoreRing } from "@/components/resume/ResumeScoreRing/ResumeScoreRing";
import { StructuredResumeEditor } from "@/components/resume/StructuredResumeEditor/StructuredResumeEditor";
import { StructuredResumePreview } from "@/components/resume/StructuredResumePreview/StructuredResumePreview";
import { useLinks } from "@/features/link/hooks";
import { isResumeParsingStatus } from "@/features/resume/api";
import {
  useAnalyzeResumeJdMatch,
  useExportResumePdf,
  useGenerateOptimizedResume,
  useParseResume,
  useResumeParseStatus,
  useDeleteResumeExport,
  useResumeExports,
  useResumePdfPreview,
  useResumeVersions,
  useResumes,
  useSaveResumeDraft,
  useSaveOptimizedResume,
  useStructureResume,
} from "@/features/resume/hooks";
import type { BackendResume, ResumeOptimizeFormValues, ResumePdfTemplate } from "@/features/resume/types";
import { useResumeStore } from "@/stores/resumeStore";
import { useAuthStore } from "@/stores/authStore";
import { formatFileSize } from "@/utils/format";
import { validateResumeFile } from "@/utils/file";
import { resumeOptimizeSchema } from "@/utils/validators";

const jobOptions = ["产品经理", "前端开发", "后端开发", "数据分析", "运营", "市场", "设计", "算法", "其他"].map(
  (item) => ({ label: item, value: item }),
);

const pdfTemplateOptions: Array<{ label: string; value: ResumePdfTemplate }> = [
  { label: "经典单栏", value: "classic" },
  { label: "现代卡片", value: "modern" },
  { label: "左侧栏", value: "sidebar" },
  { label: "Kendall", value: "kendall" },
  { label: "Even", value: "even" },
];

function getResumeListErrorMessage(error: unknown) {
  if (!axios.isAxiosError<{ message?: string }>(error)) {
    return "简历列表加载失败，请稍后重试。";
  }

  if (error.response?.status === 401) {
    return "登录状态已失效，请重新登录后查看已有简历。";
  }

  if (error.response?.data?.message) {
    return `简历列表加载失败：${error.response.data.message}`;
  }

  if (!error.response) {
    return "无法连接后端服务，请确认 NestJS 已在 http://localhost:3000 启动。";
  }

  return `简历列表加载失败：HTTP ${error.response.status}`;
}

export function ResumeOptimizePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const currentResumeId = useResumeStore((state) => state.currentResumeId);
  const setCurrentResumeId = useResumeStore((state) => state.setCurrentResumeId);
  const parseMutation = useParseResume();
  const structureMutation = useStructureResume();
  const optimizeMutation = useGenerateOptimizedResume();
  const jdMatchMutation = useAnalyzeResumeJdMatch();
  const saveOptimizedMutation = useSaveOptimizedResume();
  const exportPdfMutation = useExportResumePdf();
  const deleteExportMutation = useDeleteResumeExport();
  const saveDraftMutation = useSaveResumeDraft();
  const resumesQuery = useResumes(Boolean(token));
  const savedJobsQuery = useLinks("all", Boolean(token));
  const [progress, setProgress] = useState(0);
  const [parsedResume, setParsedResume] = useState<BackendResume>();
  const [isDragging, setIsDragging] = useState(false);
  const [isMarkdownOpen, setIsMarkdownOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isOptimizedPreviewOpen, setIsOptimizedPreviewOpen] = useState(false);
  const [isOptimizedEditorOpen, setIsOptimizedEditorOpen] = useState(false);
  const [isResumeListOpen, setIsResumeListOpen] = useState(false);
  const [isVersionListOpen, setIsVersionListOpen] = useState(false);
  const [isExportListOpen, setIsExportListOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [additionalInstruction, setAdditionalInstruction] = useState("");
  const [pdfTemplate, setPdfTemplate] = useState<ResumePdfTemplate>("classic");
  const recoveryQuery = useResumeParseStatus(
    parsedResume?.id,
    Boolean(parsedResume && isResumeParsingStatus(parsedResume.parseStatus) && !parseMutation.isPending),
  );
  const versionsQuery = useResumeVersions(parsedResume?.id);
  const exportsQuery = useResumeExports(parsedResume?.id);
  const pdfPreviewQuery = useResumePdfPreview(isPdfPreviewOpen ? parsedResume?.id : undefined, pdfTemplate);
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
  const jobDescription = watch("jobDescription");
  const savedJobOptions =
    savedJobsQuery.data?.map((job) => ({
      label: job.company ? `${job.title} · ${job.company}` : job.title,
      value: String(job.id),
    })) ?? [];

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

  async function handleOptimizeResume() {
    if (!parsedResume?.structuredContent) {
      Toast.show("请先完成结构化并确认内容");
      return;
    }

    try {
      const resume = await optimizeMutation.mutateAsync({
        resumeId: parsedResume.id,
        jobDescription,
        additionalInstruction,
      });
      setParsedResume(resume);
      setAdditionalInstruction("");
      setIsOptimizedPreviewOpen(true);
      Toast.show("简历优化稿已生成");
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? (error.code === "ECONNABORTED" ? "优化等待超时，请稍后重试" : error.message)
        : "简历优化失败，请稍后重试";
      Toast.show(message);
    }
  }

  async function handleAnalyzeJdMatch() {
    if (!parsedResume?.structuredContent) {
      Toast.show("请先选择并结构化一份简历");
      return;
    }

    if (!jobDescription?.trim()) {
      Toast.show("请先粘贴目标岗位 JD");
      return;
    }

    try {
      await jdMatchMutation.mutateAsync({
        resumeId: parsedResume.id,
        jobDescription,
      });
      Toast.show("JD 匹配度已更新");
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? error.message
        : "JD 匹配度分析失败，请稍后重试";
      Toast.show(message);
    }
  }

  async function handleSaveCurrentOptimizedResume() {
    if (!parsedResume?.optimizedContent) {
      Toast.show("暂无可保存的优化稿");
      return;
    }

    try {
      const resume = await saveOptimizedMutation.mutateAsync({
        resumeId: parsedResume.id,
        content: parsedResume.optimizedContent,
      });
      setParsedResume(resume);
      Toast.show("当前优化稿已保存");
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? error.message
        : "优化稿保存失败，请稍后重试";
      Toast.show(message);
    }
  }

  async function handleExportResumePdf() {
    if (!parsedResume) return;

    if (!parsedResume.optimizedContent && !parsedResume.structuredContent) {
      Toast.show("请先完成结构化或优化，再导出 PDF");
      return;
    }

    const versionLabel = parsedResume.finalizedAt
      ? `最终版 v${parsedResume.optimizationVersion ?? "-"}`
      : parsedResume.optimizedContent
        ? "当前优化稿"
        : "结构化简历";
    const confirmed = await Dialog.confirm({
      title: "确认导出 PDF",
      content: `确认导出【${versionLabel}】简历？`,
      confirmText: "导出",
      cancelText: "取消",
    });

    if (!confirmed) return;

    try {
      await exportPdfMutation.mutateAsync({
        resumeId: parsedResume.id,
        template: pdfTemplate,
      });
      Toast.show("PDF 已开始下载");
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? error.message
        : "PDF 导出失败，请稍后重试";
      Toast.show(message);
    }
  }

  function handleOpenPdfPreview() {
    if (!parsedResume) return;

    if (!parsedResume.optimizedContent && !parsedResume.structuredContent) {
      Toast.show("请先完成结构化或优化，再预览 PDF");
      return;
    }

    setIsPdfPreviewOpen(true);
  }

  function selectResume(resume: BackendResume) {
    setParsedResume(resume);
    setCurrentResumeId(String(resume.id));
    jdMatchMutation.reset();
    setIsResumeListOpen(false);
  }

  async function handleDeleteExport(exportId: number) {
    if (!parsedResume) return;
    const confirmed = await Dialog.confirm({
      title: "删除导出记录",
      content: "确认删除这条 PDF 导出记录和缓存文件吗？",
      confirmText: "删除",
      cancelText: "取消",
    });
    if (!confirmed) return;
    await deleteExportMutation.mutateAsync({ resumeId: parsedResume.id, exportId });
    Toast.show("导出记录已删除");
  }

  async function handleEditVersion(versionContent: NonNullable<BackendResume["draftContent"]>) {
    if (!parsedResume) return;
    const resume = await saveDraftMutation.mutateAsync({
      resumeId: parsedResume.id,
      content: versionContent,
    });
    setParsedResume(resume);
    setIsVersionListOpen(false);
    setIsOptimizedEditorOpen(true);
    Toast.show("已回到该版本草稿，可继续编辑");
  }

  async function handleExportVersion(versionId: number, label: string) {
    if (!parsedResume) return;
    const confirmed = await Dialog.confirm({
      title: "确认导出历史版本",
      content: `确认导出【${label}】的 ${pdfTemplate} 模板 PDF？`,
      confirmText: "导出",
      cancelText: "取消",
    });
    if (!confirmed) return;
    await exportPdfMutation.mutateAsync({
      resumeId: parsedResume.id,
      template: pdfTemplate,
      versionId,
    });
    Toast.show("PDF 已开始下载");
  }

  function renderResumeListItem(resume: BackendResume) {
    return (
      <button
        key={resume.id}
        type="button"
        className="card resume-list-item"
        onClick={() => selectResume(resume)}
      >
        <div className="row">
          <strong>{resume.title}</strong>
          <span className="pill">{resume.parseStatus}</span>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          简历 #{resume.id}
        </p>
      </button>
    );
  }

  const visibleResumes = resumesQuery.data?.slice(0, 3) ?? [];

  return (
    <AppShell
      title="简历优化"
      showBack
      rightSlot={
        <Button
          size="small"
          color="primary"
          type="button"
          className="resume-workbench-header-button"
          onClick={() => setIsWorkbenchOpen(true)}
        >
          工作台
        </Button>
      }
    >
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
          <div>
            <strong>从岗位库选择 JD</strong>
            <p className="muted" style={{ margin: "5px 0 0" }}>
              选择已保存岗位后，会自动填入岗位方向和 JD 文本。
            </p>
          </div>
          {savedJobOptions.length ? (
            <Selector
              multiple={false}
              options={savedJobOptions}
              onChange={(value) => {
                const selected = savedJobsQuery.data?.find((job) => job.id === Number(value[0]));
                if (!selected) return;
                setValue("jobDirection", selected.title, { shouldValidate: true });
                setValue("jobDescription", selected.description, { shouldValidate: true });
                Toast.show("已填入岗位 JD");
              }}
            />
          ) : (
            <div className="page-stack" style={{ gap: 8 }}>
              <p className="muted" style={{ margin: 0 }}>
                还没有保存岗位，可以先手动粘贴 JD，或去岗位/JD 管理中新增。
              </p>
              <Button block fill="outline" type="button" onClick={() => navigate(routePaths.jobManage)}>
                去新增岗位/JD
              </Button>
            </div>
          )}
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
            onChange={(value) => {
              setValue("jobDescription", value, { shouldValidate: true });
              jdMatchMutation.reset();
            }}
          />
          {errors.jobDescription ? (
            <p className="muted" style={{ color: "var(--color-danger)" }}>{errors.jobDescription.message}</p>
          ) : null}
        </section>

        <section className="card page-stack">
          <div className="row">
            <div>
              <strong>JD 真实匹配度</strong>
              <p className="muted" style={{ margin: "5px 0 0" }}>
                基于当前结构化简历和目标 JD 计算，不再使用固定假分。
              </p>
            </div>
            <Button
              size="small"
              color="primary"
              type="button"
              loading={jdMatchMutation.isPending}
              disabled={!token || !parsedResume?.structuredContent || !jobDescription?.trim()}
              onClick={() => void handleAnalyzeJdMatch()}
            >
              分析匹配度
            </Button>
          </div>

          {jdMatchMutation.data ? (
            <>
              <div className="row">
                <ResumeScoreRing score={jdMatchMutation.data.totalScore} size={104} label="匹配得分" />
                <div className="page-stack" style={{ gap: 8 }}>
                  {jdMatchMutation.data.metrics.map((metric) => (
                    <span className="pill" key={metric.key}>
                      {metric.label} {metric.score}
                    </span>
                  ))}
                </div>
              </div>
              <p className="muted" style={{ margin: 0 }}>{jdMatchMutation.data.summary}</p>
              {jdMatchMutation.data.missingKeywords.length ? (
                <div className="page-stack" style={{ gap: 8 }}>
                  <strong>建议优先补充</strong>
                  <div className="tag-row">
                    {jdMatchMutation.data.missingKeywords.slice(0, 10).map((keyword) => (
                      <span className="pill" key={keyword}>{keyword}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="page-stack" style={{ gap: 6 }}>
                {jdMatchMutation.data.deductions.map((item) => (
                  <p className="muted" style={{ margin: 0 }} key={item}>
                    {item}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              先选择一份已结构化简历，再粘贴 JD，点击“分析匹配度”即可看到真实分数和缺失关键词。
            </p>
          )}
        </section>

        <Button block color="primary" type="submit" loading={loading} disabled={!token}>
          上传并解析
        </Button>

      </form>

      <Popup
        visible={isWorkbenchOpen}
        onMaskClick={() => setIsWorkbenchOpen(false)}
        position="right"
        bodyClassName="resume-workbench-drawer"
      >
        <aside className="page-stack resume-popup-panel resume-workbench-panel">
          <div className="row">
            <div>
              <strong>简历工作台</strong>
              <p className="muted mt-1">管理当前简历、历史简历和 PDF 导出</p>
            </div>
            <Button size="small" type="button" onClick={() => setIsWorkbenchOpen(false)}>
              关闭
            </Button>
          </div>

          {parsedResume ? (
            <section className="card page-stack resume-current-card">
              <div className="row">
                <strong>当前简历</strong>
                <span className="pill">{parsedResume.parseStatus}</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                简历 #{parsedResume.id} · {parsedResume.title}
              </p>
              {parsedResume.finalizedAt ? (
                <p className="muted mt-0">
                  已定稿 · 版本 v{parsedResume.optimizationVersion ?? "-"}
                </p>
              ) : null}
              {parsedResume.originalContent ? (
                <>
                  <div className="resume-action-grid">
                    <Button block type="button" onClick={() => setIsMarkdownOpen(true)}>
                      查看 Markdown
                    </Button>
                    <Button
                      block
                      color="primary"
                      type="button"
                      loading={structureMutation.isPending}
                      onClick={() => void handleStructureResume()}
                    >
                      {parsedResume.structuredContent ? "重新结构化" : "一键结构化"}
                    </Button>
                    {parsedResume.structuredContent ? (
                      <>
                        <Button block type="button" onClick={() => setIsEditorOpen(true)}>
                          编辑结构化
                        </Button>
                        <Button block type="button" onClick={() => setIsPreviewOpen(true)}>
                          查看预览
                        </Button>
                        <Button
                          block
                          color="primary"
                          type="button"
                          loading={optimizeMutation.isPending}
                          onClick={() => void handleOptimizeResume()}
                        >
                          一键优化
                        </Button>
                        {parsedResume.optimizedContent ? (
                          <Button block type="button" onClick={() => setIsOptimizedPreviewOpen(true)}>
                            查看优化稿
                          </Button>
                        ) : null}
                        <Button block type="button" onClick={() => setIsVersionListOpen(true)}>
                          版本历史
                        </Button>
                      </>
                    ) : null}
                  </div>
                  {parsedResume.structuredContent ? (
                    <div className="resume-export-panel">
                      <strong>PDF 导出</strong>
                      <Selector
                        multiple={false}
                        value={[pdfTemplate]}
                        options={pdfTemplateOptions}
                        onChange={(value) => setPdfTemplate((value[0] as ResumePdfTemplate | undefined) ?? "classic")}
                      />
                      <Button block type="button" onClick={handleOpenPdfPreview}>
                        预览简历
                      </Button>
                      <Button
                        block
                        type="button"
                        loading={exportPdfMutation.isPending}
                        onClick={() => void handleExportResumePdf()}
                      >
                        下载 PDF
                      </Button>
                      <Button block type="button" onClick={() => setIsExportListOpen(true)}>
                        历史 PDF
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  MinerU 正在解析。离开页面后重新进入，系统会自动恢复进度查询。
                </p>
              )}
            </section>
          ) : (
            <section className="card page-stack">
              <strong>还没有选中简历</strong>
              <p className="muted mt-0">上传并解析一份简历，或从下方已有简历中选择。</p>
            </section>
          )}

          <section className="card page-stack">
            <div className="row">
              <strong>已有简历</strong>
              <span className="pill">{resumesQuery.data?.length ?? 0} 份</span>
            </div>
            {resumesQuery.isLoading ? <p className="muted">正在加载简历列表...</p> : null}
            {resumesQuery.isError ? <p className="muted">{getResumeListErrorMessage(resumesQuery.error)}</p> : null}
            {resumesQuery.data?.length === 0 ? <p className="muted">还没有简历记录。</p> : null}
            <div className="page-stack" style={{ gap: 10 }}>
              {(resumesQuery.data ?? visibleResumes).map(renderResumeListItem)}
            </div>
          </section>
        </aside>
      </Popup>

      <Popup
        visible={isMarkdownOpen}
        onMaskClick={() => setIsMarkdownOpen(false)}
        bodyStyle={{ maxHeight: "82vh", overflow: "auto", borderRadius: "16px 16px 0 0" }}
      >
        <section className="page-stack resume-popup-panel">
          <div className="row">
            <strong>Markdown 原文</strong>
            <Button size="small" type="button" onClick={() => setIsMarkdownOpen(false)}>
              关闭
            </Button>
          </div>
          <MarkdownPreview content={parsedResume?.originalContent} maxHeight="66vh" />
        </section>
      </Popup>

      <Popup
        visible={isEditorOpen}
        onMaskClick={() => setIsEditorOpen(false)}
        bodyStyle={{ maxHeight: "88vh", overflow: "auto", borderRadius: "16px 16px 0 0" }}
      >
        <section className="resume-popup-panel">
          {parsedResume?.structuredContent ? (
            <StructuredResumeEditor
              resumeId={parsedResume.id}
              resume={parsedResume.structuredContent}
              onSaved={(resume) => {
                setParsedResume(resume);
                setIsEditorOpen(false);
              }}
            />
          ) : null}
        </section>
      </Popup>

      <Popup
        visible={isPreviewOpen}
        onMaskClick={() => setIsPreviewOpen(false)}
        bodyStyle={{ maxHeight: "88vh", overflow: "auto", borderRadius: "16px 16px 0 0" }}
      >
        <section className="resume-popup-panel">
          {parsedResume?.structuredContent ? <StructuredResumePreview resume={parsedResume.structuredContent} /> : null}
        </section>
      </Popup>

      <Popup
        visible={isOptimizedPreviewOpen}
        onMaskClick={() => setIsOptimizedPreviewOpen(false)}
        bodyStyle={{ maxHeight: "88vh", overflow: "auto", borderRadius: "16px 16px 0 0" }}
      >
        <section className="page-stack resume-popup-panel">
          <section className="card page-stack">
            <div>
              <strong>继续优化</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                不满意可以写下一轮要求；满意后可直接保存当前优化稿。
              </p>
            </div>

            <TextArea
              rows={3}
              value={additionalInstruction}
              placeholder="例如：进一步突出项目经历，弱化过长的个人总结"
              onChange={setAdditionalInstruction}
            />

            <div className="resume-action-grid">
              <Button
                block
                color="primary"
                type="button"
                loading={optimizeMutation.isPending}
                onClick={() => void handleOptimizeResume()}
              >
                继续优化
              </Button>
              <Button
                block
                type="button"
                disabled={!parsedResume?.optimizedContent}
                onClick={() => setIsOptimizedEditorOpen(true)}
              >
                编辑优化稿
              </Button>
              <Button
                block
                type="button"
                disabled={!parsedResume?.optimizedContent}
                loading={saveOptimizedMutation.isPending}
                onClick={() => void handleSaveCurrentOptimizedResume()}
              >
                保存当前稿
              </Button>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              生成和继续优化会自动写入草稿；满意后点击“保存当前稿”确认保存。
            </p>
          </section>

          <section className="card page-stack">
            <div>
              <strong>导出 PDF</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                选择一个模板，导出当前优化稿；如果还没有优化稿，会使用已确认的结构化简历。
              </p>
            </div>
            <Selector
              multiple={false}
              value={[pdfTemplate]}
              options={pdfTemplateOptions}
              onChange={(value) => setPdfTemplate((value[0] as ResumePdfTemplate | undefined) ?? "classic")}
            />
            <Button
              block
              type="button"
              disabled={!parsedResume?.optimizedContent && !parsedResume?.structuredContent}
              onClick={handleOpenPdfPreview}
            >
              预览简历
            </Button>
            <Button
              block
              color="primary"
              type="button"
              loading={exportPdfMutation.isPending}
              disabled={!parsedResume?.optimizedContent && !parsedResume?.structuredContent}
              onClick={() => void handleExportResumePdf()}
            >
              导出 PDF 简历
            </Button>
            <Button block type="button" onClick={() => setIsExportListOpen(true)}>
              查看历史 PDF
            </Button>
          </section>

          {parsedResume?.optimizedContent ? (
            <OptimizedResumePreview
              originalResume={parsedResume.structuredContent}
              content={parsedResume.finalizedContent ?? parsedResume.draftContent ?? parsedResume.optimizedContent}
            />
          ) : null}
        </section>
      </Popup>

      <Popup
        visible={isOptimizedEditorOpen}
        onMaskClick={() => setIsOptimizedEditorOpen(false)}
        bodyStyle={{ maxHeight: "88vh", overflow: "auto", borderRadius: "16px 16px 0 0" }}
      >
        <section className="resume-popup-panel">
          {parsedResume?.optimizedContent ? (
            <OptimizedResumeEditor
              resumeId={parsedResume.id}
              content={parsedResume.draftContent ?? parsedResume.optimizedContent}
              onDraftSaved={(resume) => {
                setParsedResume(resume);
              }}
              onSaved={(resume) => {
                setParsedResume(resume);
                setIsOptimizedEditorOpen(false);
              }}
            />
          ) : null}
        </section>
      </Popup>

      <Popup
        visible={isResumeListOpen}
        onMaskClick={() => setIsResumeListOpen(false)}
        bodyStyle={{ maxHeight: "82vh", overflow: "auto", borderRadius: "16px 16px 0 0" }}
      >
        <section className="page-stack resume-popup-panel">
          <div className="row">
            <strong>全部简历</strong>
            <Button size="small" type="button" onClick={() => setIsResumeListOpen(false)}>
              关闭
            </Button>
          </div>
          {resumesQuery.data?.map(renderResumeListItem)}
        </section>
      </Popup>

      <Popup
        visible={isVersionListOpen}
        onMaskClick={() => setIsVersionListOpen(false)}
        bodyStyle={{ maxHeight: "82vh", overflow: "auto", borderRadius: "16px 16px 0 0" }}
      >
        <section className="page-stack resume-popup-panel">
          <div className="row">
            <strong>优化稿版本历史</strong>
            <Button size="small" type="button" onClick={() => setIsVersionListOpen(false)}>
              关闭
            </Button>
          </div>
          {versionsQuery.isLoading ? <p className="muted">正在加载版本历史...</p> : null}
          {versionsQuery.data?.length ? (
            versionsQuery.data.map((version) => (
              <article className="card page-stack" key={version.id}>
                <div className="row">
                  <strong>{version.label}</strong>
                  <span className="pill">{version.isFinal ? "最终版" : version.source}</span>
                </div>
                <p className="muted mt-0">
                  v{version.version} · {new Date(version.createdAt).toLocaleString()}
                </p>
                {version.notes?.length ? (
                  <ul className="resume-note-list">
                    {version.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="resume-action-grid">
                  <Button
                    block
                    type="button"
                    loading={saveDraftMutation.isPending}
                    onClick={() => void handleEditVersion(version.content)}
                  >
                    回到此版本编辑
                  </Button>
                  <Button
                    block
                    color="primary"
                    type="button"
                    loading={exportPdfMutation.isPending}
                    onClick={() => void handleExportVersion(version.id, version.label)}
                  >
                    导出此版本
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <p className="muted">暂无历史版本。保存或定稿后会出现在这里。</p>
          )}
        </section>
      </Popup>

      <Popup
        visible={isPdfPreviewOpen}
        onMaskClick={() => setIsPdfPreviewOpen(false)}
        bodyStyle={{ height: "88vh", borderRadius: "16px 16px 0 0" }}
      >
        <section className="page-stack resume-popup-panel resume-pdf-preview-popup">
          <div className="row">
            <div>
              <strong>PDF 模板预览</strong>
              <p className="muted mt-0">
                当前模板：{pdfTemplateOptions.find((option) => option.value === pdfTemplate)?.label ?? pdfTemplate}
              </p>
            </div>
            <Button size="small" type="button" onClick={() => setIsPdfPreviewOpen(false)}>
              关闭
            </Button>
          </div>
          {pdfPreviewQuery.isLoading ? <p className="muted">正在生成模板预览...</p> : null}
          {pdfPreviewQuery.isError ? <p className="muted">预览加载失败，请稍后重试。</p> : null}
          {pdfPreviewQuery.data ? (
            <iframe
              className="resume-pdf-preview-frame resume-pdf-preview-frame--popup"
              title="PDF 模板预览"
              srcDoc={pdfPreviewQuery.data}
            />
          ) : null}
        </section>
      </Popup>

      <Popup
        visible={isExportListOpen}
        onMaskClick={() => setIsExportListOpen(false)}
        bodyStyle={{ maxHeight: "82vh", overflow: "auto", borderRadius: "16px 16px 0 0" }}
      >
        <section className="page-stack resume-popup-panel">
          <div className="row">
            <strong>历史 PDF 导出</strong>
            <Button size="small" type="button" onClick={() => setIsExportListOpen(false)}>
              关闭
            </Button>
          </div>
          {exportsQuery.isLoading ? <p className="muted">正在加载历史导出...</p> : null}
          {exportsQuery.data?.length ? (
            exportsQuery.data.map((record) => (
              <article className="card page-stack" key={record.id}>
                <div className="row">
                  <strong>{record.version?.label ?? `v${record.versionNumber}`}</strong>
                  <span className="pill">{record.template}</span>
                </div>
                <p className="muted mt-0">
                  {record.isStale ? "旧版" : "当前可用"} · 下载 {record.downloadCount} 次 ·{" "}
                  {new Date(record.generatedAt).toLocaleString()}
                </p>
                <Button
                  block
                  fill="outline"
                  color="danger"
                  type="button"
                  loading={deleteExportMutation.isPending}
                  onClick={() => void handleDeleteExport(record.id)}
                >
                  删除记录
                </Button>
              </article>
            ))
          ) : (
            <p className="muted">暂无 PDF 导出记录。导出一次后会出现在这里。</p>
          )}
        </section>
      </Popup>
    </AppShell>
  );
}
