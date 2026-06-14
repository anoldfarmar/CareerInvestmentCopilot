import { Button, TextArea, Toast } from "antd-mobile";
import axios from "axios";
import { useEffect, useState } from "react";

import { useSaveStructuredResume } from "@/features/resume/hooks";
import type { BackendResume, ProjectExperience, StructuredResume } from "@/features/resume/types";

type StructuredResumeEditorProps = {
  resumeId: number;
  resume: StructuredResume;
  onSaved: (resume: BackendResume) => void;
};

type BasicInfoForm = {
  name: string;
  phone: string;
  email: string;
};

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return "结构化简历保存失败，请稍后重试";
}

export function StructuredResumeEditor({ resumeId, resume, onSaved }: StructuredResumeEditorProps) {
  const saveMutation = useSaveStructuredResume();
  const [basicInfo, setBasicInfo] = useState<BasicInfoForm>({
    name: "",
    phone: "",
    email: "",
  });
  const [summary, setSummary] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [projects, setProjects] = useState<ProjectExperience[]>([]);

  useEffect(() => {
    setBasicInfo({
      name: resume.basicInfo?.name ?? "",
      phone: resume.basicInfo?.phone ?? "",
      email: resume.basicInfo?.email ?? "",
    });
    setSummary(resume.summary ?? "");
    setSkillsText(resume.skills?.join("，") ?? "");
    setProjects(resume.projects?.length ? resume.projects : []);
  }, [resume]);

  function updateBasicInfo(key: keyof BasicInfoForm, value: string) {
    setBasicInfo((current) => ({
      ...current,
      [key]: value,
    }));
  }

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

  async function handleSave() {
    const nextResume: StructuredResume = {
      ...resume,
      basicInfo: {
        name: cleanText(basicInfo.name),
        phone: cleanText(basicInfo.phone),
        email: cleanText(basicInfo.email),
      },
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
    };

    try {
      const savedResume = await saveMutation.mutateAsync({ resumeId, resume: nextResume });
      onSaved(savedResume);
      Toast.show("结构化简历已保存");
    } catch (error) {
      Toast.show(getErrorMessage(error));
    }
  }

  return (
    <section className="card page-stack">
      <div>
        <strong>编辑结构化简历</strong>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          先确认基本信息、个人总结、技能和项目经历。工作经历、教育经历本次会原样保留。
        </p>
      </div>

      <div className="resume-editor-grid">
        <label className="resume-editor-field">
          <span>姓名</span>
          <input
            value={basicInfo.name}
            placeholder="例如：小明"
            onChange={(event) => updateBasicInfo("name", event.target.value)}
          />
        </label>

        <label className="resume-editor-field">
          <span>电话</span>
          <input
            value={basicInfo.phone}
            placeholder="例如：13800000000"
            onChange={(event) => updateBasicInfo("phone", event.target.value)}
          />
        </label>

        <label className="resume-editor-field">
          <span>邮箱</span>
          <input
            value={basicInfo.email}
            placeholder="例如：xiaoming@example.com"
            onChange={(event) => updateBasicInfo("email", event.target.value)}
          />
        </label>
      </div>

      <label className="resume-editor-field">
        <span>个人总结</span>
        <TextArea
          rows={4}
          value={summary}
          placeholder="从简历中提取出的个人总结，可人工修正"
          onChange={setSummary}
        />
      </label>

      <label className="resume-editor-field">
        <span>技能</span>
        <TextArea
          rows={3}
          value={skillsText}
          placeholder="用逗号、中文逗号或换行分隔，例如：React，TypeScript，NestJS"
          onChange={setSkillsText}
        />
      </label>

      <div className="resume-editor-section">
        <div className="row">
          <span>项目经历</span>
          <Button size="small" type="button" onClick={addProject}>
            添加项目
          </Button>
        </div>

        {projects.length ? (
          projects.map((project, index) => (
            <div className="resume-editor-nested-card" key={`${project.name}-${index}`}>
              <label className="resume-editor-field">
                <span>项目名称</span>
                <input
                  value={project.name}
                  placeholder="例如：AI 求职助手"
                  onChange={(event) => updateProject(index, "name", event.target.value)}
                />
              </label>

              <label className="resume-editor-field">
                <span>项目描述</span>
                <TextArea
                  rows={3}
                  value={project.description ?? ""}
                  placeholder="项目背景、职责、技术栈、结果等"
                  onChange={(value) => updateProject(index, "description", value)}
                />
              </label>

              <Button block fill="outline" color="danger" type="button" onClick={() => removeProject(index)}>
                删除该项目
              </Button>
            </div>
          ))
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            暂无项目经历。若 AI 没有识别出来，可以手动添加。
          </p>
        )}
      </div>

      <Button block color="primary" type="button" loading={saveMutation.isPending} onClick={() => void handleSave()}>
        保存结构化简历
      </Button>
    </section>
  );
}
