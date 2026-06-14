import { Button, Dialog, TextArea, Toast } from "antd-mobile";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFinalizeResume, useSaveOptimizedResume, useSaveResumeDraft } from "@/features/resume/hooks";
import type { BackendResume, OptimizedResumeContent, ProjectExperience } from "@/features/resume/types";

type OptimizedResumeEditorProps = {
  resumeId: number;
  content: OptimizedResumeContent;
  onSaved: (resume: BackendResume) => void;
  onDraftSaved?: (resume: BackendResume) => void;
};

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return "优化稿保存失败，请稍后重试";
}

export function OptimizedResumeEditor({ resumeId, content, onSaved, onDraftSaved }: OptimizedResumeEditorProps) {
  const saveMutation = useSaveOptimizedResume();
  const draftMutation = useSaveResumeDraft();
  const finalizeMutation = useFinalizeResume();
  const initializedRef = useRef(false);
  const [summary, setSummary] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [projects, setProjects] = useState<ProjectExperience[]>([]);
  const [saveStatus, setSaveStatus] = useState<"saved" | "dirty" | "saving">("saved");

  useEffect(() => {
    setSummary(content.optimizedResume.summary ?? "");
    setSkillsText(content.optimizedResume.skills?.join("，") ?? "");
    setNotesText(content.optimizationNotes.join("\n"));
    setProjects(content.optimizedResume.projects?.length ? content.optimizedResume.projects : []);
    setSaveStatus("saved");
    initializedRef.current = false;
  }, [content]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    setSaveStatus("dirty");
  }, [summary, skillsText, notesText, projects]);

  function updateProject(index: number, key: keyof ProjectExperience, value: string) {
    setProjects((current) =>
      current.map((project, currentIndex) => (currentIndex === index ? { ...project, [key]: value } : project)),
    );
  }

  function addProject() {
    setProjects((current) => [...current, { name: "", description: "" }]);
  }

  function removeProject(index: number) {
    setProjects((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  const buildContent = useCallback((): OptimizedResumeContent => {
    return {
      optimizedResume: {
        ...content.optimizedResume,
        summary: cleanText(summary),
        skills: skillsText
          .split(/[,，\n]/)
          .map((skill) => skill.trim())
          .filter(Boolean),
        projects: projects
          .map((project) => ({
            name: project.name.trim(),
            description: cleanText(project.description ?? ""),
          }))
          .filter((project) => project.name),
      },
      optimizationNotes: notesText
        .split(/\n/)
        .map((note) => note.trim())
        .filter(Boolean),
    };
  }, [content.optimizedResume, notesText, projects, skillsText, summary]);

  useEffect(() => {
    if (saveStatus !== "dirty") return;

    const timer = window.setTimeout(() => {
      const nextContent = buildContent();
      setSaveStatus("saving");
      draftMutation
        .mutateAsync({ resumeId, content: nextContent })
        .then((resume) => {
          onDraftSaved?.(resume);
          setSaveStatus("saved");
        })
        .catch(() => {
          setSaveStatus("dirty");
        });
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [buildContent, draftMutation, onDraftSaved, resumeId, saveStatus]);

  async function handleSave() {
    const nextContent = buildContent();

    try {
      const savedResume = await saveMutation.mutateAsync({ resumeId, content: nextContent });
      onSaved(savedResume);
      setSaveStatus("saved");
      Toast.show("优化稿已保存");
    } catch (error) {
      Toast.show(getErrorMessage(error));
    }
  }

  async function handleFinalize() {
    const nextContent = buildContent();
    const confirmed = await Dialog.confirm({
      title: "确认定稿",
      content: "确认将当前优化稿设为最终版吗？后续导出 PDF 将默认使用这个版本。",
      confirmText: "确认为最终版",
      cancelText: "再看看",
    });

    if (!confirmed) return;

    try {
      const savedResume = await finalizeMutation.mutateAsync({
        resumeId,
        content: nextContent,
        label: "最终版",
      });
      onSaved(savedResume);
      setSaveStatus("saved");
      Toast.show("已确认为最终版");
    } catch (error) {
      Toast.show(getErrorMessage(error));
    }
  }

  return (
    <section className="card page-stack">
      <div>
        <div className="row">
          <strong>编辑优化稿</strong>
          <span className="pill">
            {saveStatus === "saving" ? "自动保存中" : saveStatus === "dirty" ? "有未保存改动" : "已保存"}
          </span>
        </div>
        <p className="muted mt-2">
          用户可以人工修正优化结果。保存后，下一轮“继续优化”会基于当前优化稿继续改。
        </p>
      </div>

      <label className="resume-editor-field">
        <span>优化后个人总结</span>
        <TextArea rows={4} value={summary} onChange={setSummary} />
      </label>

      <label className="resume-editor-field">
        <span>优化后技能</span>
        <TextArea rows={3} value={skillsText} placeholder="用逗号、中文逗号或换行分隔" onChange={setSkillsText} />
      </label>

      <label className="resume-editor-field">
        <span>优化说明</span>
        <TextArea rows={3} value={notesText} placeholder="每行一条优化说明" onChange={setNotesText} />
      </label>

      <div className="resume-editor-section">
        <div className="row">
          <span>优化后项目经历</span>
          <Button size="small" type="button" onClick={addProject}>
            添加项目
          </Button>
        </div>

        {projects.length ? (
          projects.map((project, index) => (
            <div className="resume-editor-nested-card" key={`${project.name}-${index}`}>
              <label className="resume-editor-field">
                <span>项目名称</span>
                <input value={project.name} onChange={(event) => updateProject(index, "name", event.target.value)} />
              </label>

              <label className="resume-editor-field">
                <span>项目描述</span>
                <TextArea
                  rows={3}
                  value={project.description ?? ""}
                  onChange={(value) => updateProject(index, "description", value)}
                />
              </label>

              <Button block fill="outline" color="danger" type="button" onClick={() => removeProject(index)}>
                删除该项目
              </Button>
            </div>
          ))
        ) : (
          <p className="muted mt-0">
            暂无项目经历。
          </p>
        )}
      </div>

      <div className="resume-action-grid">
        <Button block type="button" loading={saveMutation.isPending} onClick={() => void handleSave()}>
          保存优化稿
        </Button>
        <Button
          block
          color="primary"
          type="button"
          loading={finalizeMutation.isPending}
          onClick={() => void handleFinalize()}
        >
          确认为最终版
        </Button>
      </div>
    </section>
  );
}
