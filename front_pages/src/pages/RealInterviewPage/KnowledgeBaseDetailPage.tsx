import { Button, Input, Popup, Selector, TextArea, Toast } from "antd-mobile";
import { FileAudio, FileText, Plus, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { AppShell } from "@/components/common/AppShell/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/State/State";
import {
  useCreateManualInterviewRecord,
  useKnowledgeBase,
  useUploadInterviewAudio,
} from "@/features/knowledgeBase/hooks";
import type { RealInterviewSourceType } from "@/features/knowledgeBase/types";
import { formatFileSize } from "@/utils/format";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function KnowledgeBaseDetailPage() {
  const { knowledgeBaseId = "" } = useParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [sourceType, setSourceType] = useState<RealInterviewSourceType>("manual");
  const [title, setTitle] = useState("");
  const [interviewDate, setInterviewDate] = useState(today());
  const [transcript, setTranscript] = useState("");
  const [audioFile, setAudioFile] = useState<File>();
  const { data, isLoading, isError, refetch } = useKnowledgeBase(knowledgeBaseId);
  const createManualMutation = useCreateManualInterviewRecord();
  const uploadAudioMutation = useUploadInterviewAudio();

  function openCreate() {
    setSourceType("manual");
    setTitle("");
    setInterviewDate(today());
    setTranscript("");
    setAudioFile(undefined);
    setVisible(true);
  }

  function handleAudioFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
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
      if (!audioFile) {
        Toast.show("请先选择录音文件");
        return;
      }
      await uploadAudioMutation.mutateAsync({ knowledgeBaseId, title: title.trim(), interviewDate, audioFile });
    }
    setVisible(false);
    Toast.show(sourceType === "manual" ? "面试对话已录入" : "录音已上传，等待转写");
  }

  return (
    <AppShell title={data?.name ?? "知识库详情"} showBack showTabBar={false}>
      {isLoading ? <LoadingState text="正在加载知识库详情" /> : null}
      {isError ? <ErrorState title="知识库加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <section className="card page-stack">
            <div className="row">
              <div>
                <strong>{data.name}</strong>
                <p className="muted" style={{ margin: "5px 0 0" }}>
                  已沉淀 {data.recordCount} 场真实面试
                </p>
              </div>
              <Button size="small" color="primary" onClick={openCreate}>
                <Plus size={15} /> 添加
              </Button>
            </div>
            {data.description ? (
              <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                {data.description}
              </p>
            ) : null}
            <p className="muted" style={{ margin: 0 }}>
              后续模拟面试可选择此知识库，让问题结合真实面试内容和薄弱环节生成。
            </p>
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
                <span className="row" style={{ justifyContent: "flex-start" }}>
                  {record.sourceType === "audio" ? (
                    <FileAudio color="var(--color-accent)" size={19} />
                  ) : (
                    <FileText color="var(--color-primary)" size={19} />
                  )}
                  <strong>{record.title}</strong>
                </span>
                <span className="pill">{record.status === "ready" ? "已入库" : "处理中"}</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {record.interviewDate} · {record.sourceType === "audio" ? "录音导入" : "手动录入"}
              </p>
              {record.audioFileName ? (
                <p className="muted" style={{ margin: 0 }}>
                  {record.audioFileName}
                  {record.audioFileSize ? ` · ${formatFileSize(record.audioFileSize)}` : ""}
                </p>
              ) : null}
              {record.transcript ? (
                <p
                  style={{
                    maxHeight: 94,
                    overflow: "hidden",
                    margin: 0,
                    color: "var(--color-text-secondary)",
                    fontSize: 13,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {record.transcript}
                </p>
              ) : null}
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
              <input ref={inputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleAudioFile} />
              <Button block fill="outline" onClick={() => inputRef.current?.click()}>
                <UploadCloud size={16} /> {audioFile ? "重新选择录音" : "选择录音文件"}
              </Button>
              <p className="muted" style={{ margin: 0 }}>
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
    </AppShell>
  );
}
