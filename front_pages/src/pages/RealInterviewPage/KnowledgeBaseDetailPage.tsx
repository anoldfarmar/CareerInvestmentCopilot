import { Button, Input, Popup, Selector, TextArea, Toast } from "antd-mobile";
import { FileAudio, FileText, Plus, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { AppShell } from "@/components/common/AppShell/AppShell";
import { EmptyState, ErrorState, SkeletonState } from "@/components/common/State/State";
import {
  useBuildKnowledgeRecord,
  useCreateManualInterviewRecord,
  useDeleteKnowledgeRecord,
  useKnowledgeBase,
  useTranscribeAudioRecord,
  useUploadInterviewAudio,
} from "@/features/knowledgeBase/hooks";
import type { RealInterviewRecord, RealInterviewSourceType } from "@/features/knowledgeBase/types";
import { formatFileSize } from "@/utils/format";

function today() {
  return new Date().toISOString().slice(0, 10);
}

type AudioImportMode = "url" | "file";

export function KnowledgeBaseDetailPage() {
  const { knowledgeBaseId = "" } = useParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [sourceType, setSourceType] = useState<RealInterviewSourceType>("manual");
  const [title, setTitle] = useState("");
  const [interviewDate, setInterviewDate] = useState(today());
  const [transcript, setTranscript] = useState("");
  const [audioImportMode, setAudioImportMode] = useState<AudioImportMode>("url");
  const [audioFile, setAudioFile] = useState<File>();
  const [audioUrl, setAudioUrl] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RealInterviewRecord | null>(null);
  const { data, isLoading, isError, refetch } = useKnowledgeBase(knowledgeBaseId);
  const createManualMutation = useCreateManualInterviewRecord();
  const uploadAudioMutation = useUploadInterviewAudio();
  const buildRecordMutation = useBuildKnowledgeRecord();
  const transcribeMutation = useTranscribeAudioRecord();
  const deleteRecordMutation = useDeleteKnowledgeRecord();

  function getBuildStatusLabel(status?: string) {
    const labels: Record<string, string> = {
      not_built: "待构建",
      empty: "无文本",
      waiting_asr: "待转写",
      building: "构建中",
      built: "已构建",
      failed: "构建失败",
    };
    return labels[status ?? "not_built"] ?? "待构建";
  }

  function formatJson(value: unknown) {
    if (!value) return "";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  async function handleBuildRecord(recordId: string) {
    await buildRecordMutation.mutateAsync({ knowledgeBaseId, recordId });
    Toast.show("知识库构建完成");
  }

  async function handleTranscribeRecord(recordId: string, recordAudioUrl?: string) {
    if (!recordAudioUrl) {
      Toast.show("请先提供公网可访问的音频 URL");
      return;
    }
    await transcribeMutation.mutateAsync({ knowledgeBaseId, recordId, audioUrl: recordAudioUrl });
    Toast.show("录音转写完成");
  }

  async function handleDeleteRecord(record: RealInterviewRecord) {
    const confirmed = window.confirm(`确定删除面试记录「${record.title}」吗？`);
    if (!confirmed) return;

    await deleteRecordMutation.mutateAsync({ knowledgeBaseId, recordId: record.id });
    if (selectedRecord?.id === record.id) {
      setSelectedRecord(null);
    }
    Toast.show("面试记录已删除");
  }

  function openCreate() {
    setSourceType("manual");
    setTitle("");
    setInterviewDate(today());
    setTranscript("");
    setAudioImportMode("url");
    setAudioFile(undefined);
    setAudioUrl("");
    setVisible(true);
  }

  function handleAudioFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isAudioLike =
      file.type.startsWith("audio/") ||
      file.type === "video/mp4" ||
      [".m4a", ".mp3", ".wav", ".aac", ".ogg", ".oga", ".webm", ".mp4", ".flac", ".amr"].some((ext) =>
        lowerName.endsWith(ext),
      );
    if (!isAudioLike) {
      Toast.show("请选择音频文件");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      Toast.show("录音文件不能超过 100MB");
      return;
    }
    setAudioFile(file);
  }

  async function handleCreate() {
    if (!title.trim()) {
      Toast.show("请输入面试记录标题");
      return;
    }

    if (sourceType === "manual") {
      if (transcript.trim().length < 20) {
        Toast.show("请输入至少 20 个字符的面试对话");
        return;
      }
      await createManualMutation.mutateAsync({
        knowledgeBaseId,
        title: title.trim(),
        interviewDate,
        transcript: transcript.trim(),
      });
    } else {
      const trimmedAudioUrl = audioUrl.trim();
      if (audioImportMode === "url" && !trimmedAudioUrl) {
        Toast.show("请填写公网可访问的音频 URL");
        return;
      }
      if (audioImportMode === "file" && !audioFile) {
        Toast.show("请先选择录音文件");
        return;
      }
      await uploadAudioMutation.mutateAsync({
        knowledgeBaseId,
        title: title.trim(),
        interviewDate,
        audioUrl: trimmedAudioUrl || undefined,
        audioFile: audioImportMode === "file" ? audioFile : undefined,
      });
    }

    setVisible(false);
    Toast.show(sourceType === "manual" ? "面试对话已录入" : "录音已保存，等待转写");
  }

  return (
    <AppShell title={data?.name ?? "知识库详情"} showBack showTabBar={false}>
      {isLoading ? <SkeletonState rows={3} /> : null}
      {isError ? <ErrorState title="知识库加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <section className="card page-stack">
            <div className="row">
              <div>
                <strong>{data.name}</strong>
                <p className="muted mt-1">已沉淀 {data.recordCount} 场真实面试</p>
              </div>
              <Button size="small" color="primary" onClick={openCreate}>
                <Plus size={15} /> 添加
              </Button>
            </div>
            {data.description ? <p className="text-block">{data.description}</p> : null}
            <section className="knowledge-impact-card">
              <div className="row">
                <strong>本月影响</strong>
                <span className="pill">{data.impactStats?.monthlyQuestionCount ?? 0} 道模拟题</span>
              </div>
              <p>{data.impactStats?.recommendation ?? "下次模拟面试可勾选该知识库，验证出题效果。"}</p>
              <span className="muted">关联模拟面试 {data.impactStats?.relatedSessionCount ?? 0} 场</span>
            </section>
          </section>

          {data.records.length === 0 ? (
            <EmptyState
              title="知识库还是空的"
              description="导入真实面试录音，或手动录入面试官与候选人的对话。"
              actionText="添加真实面试"
              onAction={openCreate}
            />
          ) : null}

          {data.records.map((record) => (
            <article className="card page-stack" key={record.id}>
              <div className="row">
                <span className="row inline-leading">
                  {record.sourceType === "audio" ? (
                    <FileAudio color="var(--color-accent)" size={19} />
                  ) : (
                    <FileText color="var(--color-primary)" size={19} />
                  )}
                  <strong>{record.title}</strong>
                </span>
                <span className="pill">{record.status === "ready" ? "已入库" : "处理中"}</span>
              </div>
              <p className="muted mt-0">
                {record.interviewDate} · {record.sourceType === "audio" ? "录音导入" : "手动录入"}
              </p>
              <div className="row">
                <span className="pill">{getBuildStatusLabel(record.buildStatus)}</span>
                {record.buildStatus === "built" ? (
                  <span className="muted">{record.chunks?.length ?? 0} 个检索片段</span>
                ) : record.buildStatus === "waiting_asr" ? (
                  record.audioUrl ? (
                    <Button
                      size="small"
                      color="primary"
                      loading={transcribeMutation.isPending}
                      onClick={() => void handleTranscribeRecord(record.id, record.audioUrl)}
                    >
                      开始转写
                    </Button>
                  ) : (
                    <span className="muted">等待公网音频 URL 后转写</span>
                  )
                ) : (
                  <Button
                    size="small"
                    color="primary"
                    loading={buildRecordMutation.isPending}
                    disabled={!record.transcript || record.buildStatus === "building"}
                    onClick={() => void handleBuildRecord(record.id)}
                  >
                    构建知识库
                  </Button>
                )}
              </div>
              {record.buildError ? <p className="muted text-danger mt-0">{record.buildError}</p> : null}
              <Button size="small" fill="outline" onClick={() => setSelectedRecord(record)}>
                查看内容
              </Button>
              <Button
                size="small"
                fill="none"
                color="danger"
                loading={deleteRecordMutation.isPending}
                onClick={() => void handleDeleteRecord(record)}
              >
                删除
              </Button>
              {record.audioFileName ? (
                <p className="muted mt-0">
                  {record.audioFileName}
                  {record.audioFileSize ? ` · ${formatFileSize(record.audioFileSize)}` : ""}
                </p>
              ) : null}
              <section className="knowledge-impact-card">
                <div className="row">
                  <strong>影响统计</strong>
                  <span className="pill">本月约 {record.impactStats?.monthlyQuestionCount ?? 0} 道题</span>
                </div>
                <p>{record.impactStats?.recommendation ?? "下次模拟面试勾选该知识库后，这条记录会参与出题。"}</p>
              </section>
              {record.transcript ? <p className="clamp-preview">{record.transcript}</p> : null}
            </article>
          ))}
        </div>
      ) : null}

      <Popup
        visible={visible}
        onMaskClick={() => setVisible(false)}
        bodyStyle={{ borderRadius: "20px 20px 0 0", padding: 16 }}
      >
        <div className="page-stack">
          <strong>添加真实面试</strong>
          <Selector
            multiple={false}
            value={[sourceType]}
            options={[
              { label: "手动录入对话", value: "manual" },
              { label: "导入面试录音", value: "audio" },
            ]}
            onChange={(value) => setSourceType((value[0] as RealInterviewSourceType) ?? "manual")}
          />
          <Input value={title} maxLength={50} placeholder="标题，例如：某公司前端一面" onChange={setTitle} />
          <Input value={interviewDate} type="date" onChange={setInterviewDate} />
          {sourceType === "manual" ? (
            <TextArea
              value={transcript}
              rows={6}
              maxLength={5000}
              placeholder={"按对话过程录入，例如：\n面试官：请介绍一下项目。\n候选人：..."}
              onChange={setTranscript}
            />
          ) : (
            <>
              <Selector
                multiple={false}
                value={[audioImportMode]}
                options={[
                  { label: "公网 URL", value: "url" },
                  { label: "本地文件", value: "file" },
                ]}
                onChange={(value) => {
                  const nextMode = (value[0] as AudioImportMode) ?? "url";
                  setAudioImportMode(nextMode);
                  if (nextMode === "url") {
                    setAudioFile(undefined);
                  }
                  if (nextMode === "file") {
                    setAudioUrl("");
                  }
                }}
              />
              {audioImportMode === "url" ? (
                <>
                  <Input
                    value={audioUrl}
                    placeholder="请输入公网可访问音频 URL，供 DashScope ASR 读取"
                    onChange={setAudioUrl}
                  />
                  <p className="muted mt-0">适合本机开发：后端保存 URL，ASR 可以直接读取公网音频。</p>
                </>
              ) : (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="audio/*"
                    style={{ display: "none" }}
                    onChange={handleAudioFile}
                  />
                  <Button block fill="outline" onClick={() => inputRef.current?.click()}>
                    <UploadCloud size={16} /> {audioFile ? "重新选择录音" : "选择录音文件"}
                  </Button>
                  <p className="muted mt-0">本地文件适合后端已部署公网或已配置公网文件服务时使用。</p>
                </>
              )}
              <p className="muted mt-0">
                {audioFile ? `${audioFile.name} · ${formatFileSize(audioFile.size)}` : "支持常见音频格式，单文件最大 100MB"}
              </p>
            </>
          )}
          <Button
            block
            color="primary"
            loading={createManualMutation.isPending || uploadAudioMutation.isPending}
            onClick={() => void handleCreate()}
          >
            保存到知识库
          </Button>
        </div>
      </Popup>

      <Popup
        visible={Boolean(selectedRecord)}
        onMaskClick={() => setSelectedRecord(null)}
        bodyStyle={{ borderRadius: "20px 20px 0 0", padding: 16, maxHeight: "82vh", overflowY: "auto" }}
      >
        {selectedRecord ? (
          <div className="page-stack">
            <div className="row">
              <strong>{selectedRecord.title}</strong>
              <Button size="small" fill="none" onClick={() => setSelectedRecord(null)}>
                关闭
              </Button>
            </div>
            <p className="muted mt-0">
              {selectedRecord.interviewDate} · {selectedRecord.sourceType === "audio" ? "录音导入" : "手动录入"}
            </p>
            {selectedRecord.audioUrl ? (
              <section className="knowledge-impact-card">
                <strong>音频 URL</strong>
                <p className="text-block">{selectedRecord.audioUrl}</p>
              </section>
            ) : null}
            {selectedRecord.transcript ? (
              <section className="knowledge-impact-card">
                <strong>转写 / 原始文本</strong>
                <p className="text-block">{selectedRecord.transcript}</p>
              </section>
            ) : null}
            {selectedRecord.speakerTranscript ? (
              <section className="knowledge-impact-card">
                <strong>说话人转写</strong>
                <p className="text-block">{selectedRecord.speakerTranscript}</p>
              </section>
            ) : null}
            {selectedRecord.roleTranscript ? (
              <section className="knowledge-impact-card">
                <strong>角色转写</strong>
                <p className="text-block">{selectedRecord.roleTranscript}</p>
              </section>
            ) : null}
            {selectedRecord.structuredContent ? (
              <section className="knowledge-impact-card">
                <strong>结构化内容</strong>
                <pre className="text-block">{formatJson(selectedRecord.structuredContent)}</pre>
              </section>
            ) : null}
            {selectedRecord.chunks?.length ? (
              <section className="knowledge-impact-card">
                <strong>RAG 检索片段</strong>
                <pre className="text-block">{formatJson(selectedRecord.chunks)}</pre>
              </section>
            ) : null}
            {!selectedRecord.transcript &&
            !selectedRecord.structuredContent &&
            !selectedRecord.chunks?.length ? (
              <p className="muted">这条记录还没有可展示的知识库内容，请先完成转写和构建知识库。</p>
            ) : null}
          </div>
        ) : null}
      </Popup>
    </AppShell>
  );
}
