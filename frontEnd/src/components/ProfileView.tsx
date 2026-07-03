import React, { useEffect, useRef, useState } from "react";
import { BackendProfile, backendApi } from "../api/backend";
import { API_BASE_URL } from "../api/client";
import { Resume } from "../types";

interface ProfileViewProps {
  resumes: Resume[];
  onUploadResume: (file: File) => Promise<void>;
  onDeleteResume: (id: string) => Promise<void>;
  onRenameResume: (id: string, title: string) => Promise<unknown>;
  deliveryCount: number;
  interviewCount: number;
  onLogout: () => void;
}

const jobPreferenceOptions = [
  { value: "研发", label: "研发", directions: ["后端", "前端", "大数据", "测试", "算法", "客户端", "基础架构", "多媒体", "安全", "计算机视觉", "数据挖掘", "运维", "自然语言处理", "机器学习", "硬件"] },
  { value: "运营", label: "运营", directions: ["商业运营", "审核", "用户运营", "内容运营", "频道运营", "产品运营", "销售运营", "编辑", "内容引进", "客服", "游戏运营", "项目管理"] },
  { value: "产品", label: "产品", directions: ["产品经理", "商业产品(广告)", "数据分析"] },
  { value: "职能_支持", label: "职能/支持", directions: ["法务", "战略", "人力", "财务", "行政设施", "IT支持", "采购", "投资", "内审"] },
  { value: "销售", label: "销售", directions: ["销售", "销售支持", "销售专员", "销售管理"] },
  { value: "设计", label: "设计", directions: ["UI", "平面设计", "交互设计", "视觉设计", "用户研究", "多媒体设计", "3D动效", "游戏美术"] },
  { value: "市场", label: "市场", directions: ["广告投放", "营销策划", "PR", "品牌", "政府关系", "商务拓展BD", "媒介公关"] },
  { value: "游戏策划", label: "游戏策划", directions: ["游戏系统策划", "游戏数值策划", "游戏剧情策划", "游戏音频策划"] },
  { value: "教研教学", label: "教研教学", directions: ["教研", "主讲", "课程辅导", "教务管理"] },
] as const;

const legacyDirectionMap: Record<string, string[]> = {
  internet: ["研发"],
  ai: ["研发", "算法", "自然语言处理", "机器学习"],
  finance: ["产品", "数据分析"],
  enterprise: ["产品"],
  education: ["教研教学"],
  tech: ["研发", "后端"],
  custom: ["研发"],
};

const jobPreferenceLabels = Object.fromEntries(
  jobPreferenceOptions.map((option) => [option.value, option.label]),
) as Record<string, string>;

const jobModeOptions = [
  { value: "student", label: "学生/校招" },
  { value: "junior", label: "初级求职者" },
  { value: "mid", label: "中级职场人" },
  { value: "senior", label: "资深候选人" },
  { value: "career-switcher", label: "转行求职" },
  { value: "entrepreneur", label: "创业/管理" },
];

const defaultProfile: BackendProfile = {
  name: "",
  jobMode: "junior",
  targetDirection: "研发",
  targetDirections: ["研发", "后端"],
  customTargetDirection: "",
  subscriptionPlan: "free",
  language: "zh-CN",
  questionCount: 5,
  enableVoiceInput: true,
  showStarTips: true,
};

type PdfPreviewState = {
  resumeName: string;
  url: string;
  isObjectUrl: boolean;
};

export default function ProfileView({
  resumes,
  onUploadResume,
  onDeleteResume,
  onRenameResume,
  deliveryCount,
  interviewCount,
  onLogout,
}: ProfileViewProps) {
  const [profile, setProfile] = useState<BackendProfile>(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState<BackendProfile>(defaultProfile);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [swipedResumeId, setSwipedResumeId] = useState<string | null>(null);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const [previewingResumeId, setPreviewingResumeId] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState | null>(null);
  const [renameResume, setRenameResume] = useState<Resume | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const touchStartX = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const averageWellness =
    resumes.length === 0
      ? 0
      : Math.round(resumes.reduce((sum, resume) => sum + resume.wellness, 0) / resumes.length);
  const keywordTotal = resumes.reduce((sum, resume) => sum + resume.keywordCount, 0);
  const displayName = profile.name || "未设置姓名";
  const displayTitle = buildProfileTitle(profile);

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (pdfPreview?.isObjectUrl) {
        URL.revokeObjectURL(pdfPreview.url);
      }
    };
  }, [pdfPreview]);

  const loadProfile = async () => {
    setIsProfileLoading(true);
    setProfileError("");
    try {
      const response = await backendApi.profile();
      const normalized = normalizeProfile(response);
      setProfile(normalized);
      setDraftProfile(normalized);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "个人资料加载失败");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    setProfileError("");
    try {
      const directions = normalizeDirections(draftProfile.targetDirections, draftProfile.targetDirection);
      const saved = await backendApi.updateProfile({
        name: draftProfile.name.trim(),
        jobMode: draftProfile.jobMode,
        targetDirection: directions[0],
        targetDirections: directions,
        customTargetDirection: draftProfile.customTargetDirection.trim(),
        subscriptionPlan: draftProfile.subscriptionPlan,
        language: draftProfile.language,
        questionCount: draftProfile.questionCount,
        enableVoiceInput: draftProfile.enableVoiceInput,
        showStarTips: draftProfile.showStarTips,
      });
      const normalized = normalizeProfile(saved);
      setProfile(normalized);
      setDraftProfile(normalized);
      setIsEditing(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "个人资料保存失败");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleClearProfile = async () => {
    if (!window.confirm("确定清空个人资料吗？登录账号、简历、面试记录不会删除。")) return;

    setIsProfileSaving(true);
    setProfileError("");
    try {
      const cleared = await backendApi.deleteProfile();
      const normalized = normalizeProfile(cleared);
      setProfile(normalized);
      setDraftProfile(normalized);
      setIsEditing(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "个人资料清空失败");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const updateDraft = <K extends keyof BackendProfile>(key: K, value: BackendProfile[K]) => {
    setDraftProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMainCategory = (category: string) => {
    setDraftProfile((prev) => {
      const option = jobPreferenceOptions.find((item) => item.value === category);
      const current = normalizeDirections(prev.targetDirections, prev.targetDirection);
      const selected = current.includes(category);
      const childDirections: string[] = option ? [...option.directions] : [];
      const nextDirections = selected
        ? current.filter((item) => item !== category && !childDirections.includes(item))
        : [...current, category];
      const normalized = normalizeDirections(nextDirections);
      return {
        ...prev,
        targetDirections: normalized,
        targetDirection: normalized[0],
      };
    });
  };

  const toggleSubDirection = (direction: string) => {
    setDraftProfile((prev) => {
      const current = normalizeDirections(prev.targetDirections, prev.targetDirection);
      const parent = jobPreferenceOptions.find((item) => ([...item.directions] as string[]).includes(direction));
      const withParent = parent && !current.includes(parent.value) ? [...current, parent.value] : current;
      const nextDirections = withParent.includes(direction)
        ? withParent.filter((item) => item !== direction)
        : [...withParent, direction];
      const normalized = normalizeDirections(nextDirections);
      return {
        ...prev,
        targetDirections: normalized,
        targetDirection: normalized[0],
      };
    });
  };

  const removeDirection = (direction: string) => {
    setDraftProfile((prev) => {
      const category = jobPreferenceOptions.find((item) => item.value === direction);
      const childDirections = category ? [...category.directions] : [];
      const nextDirections = prev.targetDirections.filter(
        (item) => item !== direction && !childDirections.includes(item),
      );
      const normalized = normalizeDirections(nextDirections);
      return {
        ...prev,
        targetDirections: normalized,
        targetDirection: normalized[0],
      };
    });
  };

  const selectedCategories = jobPreferenceOptions.filter((option) =>
    draftProfile.targetDirections.includes(option.value),
  );
  const availableSubDirections = [
    ...new Set(selectedCategories.flatMap((option) => option.directions)),
  ];

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setUploadError("");
    setIsUploading(true);
    try {
      await onUploadResume(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "简历上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async (id: string) => {
    setDeletingResumeId(id);
    setUploadError("");
    try {
      await onDeleteResume(id);
      setSwipedResumeId(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "简历删除失败，请稍后重试");
    } finally {
      setDeletingResumeId(null);
    }
  };

  const handlePreviewResume = async (resume: Resume) => {
    if (previewingResumeId) return;

    setUploadError("");
    setPreviewingResumeId(resume.id);

    try {
      if (isPdfResume(resume) && resume.fileUrl) {
        openPdfPreview({
          resumeName: resume.name,
          url: toAbsoluteUrl(resume.fileUrl),
          isObjectUrl: false,
        });
        return;
      }

      const blob = await backendApi.exportResumePdf(resume.id, "classic");
      if (!blob.size) {
        throw new Error("PDF 文件为空，请稍后重试。");
      }

      const url = URL.createObjectURL(blob);
      openPdfPreview({
        resumeName: resume.name,
        url,
        isObjectUrl: true,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "PDF 预览失败，请稍后重试");
    } finally {
      setPreviewingResumeId(null);
    }
  };

  const openPdfPreview = (nextPreview: PdfPreviewState) => {
    setPdfPreview((current) => {
      if (current?.isObjectUrl) {
        URL.revokeObjectURL(current.url);
      }
      return nextPreview;
    });
  };

  const closePdfPreview = () => {
    setPdfPreview((current) => {
      if (current?.isObjectUrl) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
  };

  const openRenameDialog = (resume: Resume) => {
    setUploadError("");
    setRenameResume(resume);
    setRenameValue(resume.name);
  };

  const closeRenameDialog = () => {
    if (isRenaming) return;
    setRenameResume(null);
    setRenameValue("");
  };

  const handleRenameSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!renameResume || isRenaming) return;

    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      setUploadError("简历名称不能为空");
      return;
    }

    setUploadError("");
    setIsRenaming(true);
    try {
      await onRenameResume(renameResume.id, nextTitle);
      setRenameResume(null);
      setRenameValue("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "简历重命名失败，请稍后重试");
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div id="profile-pane-root" className="animate-fade-in-up">
      {/* TopAppBar */}
      <header className="bg-white border-b border-border-subtle fixed top-0 w-full z-50 flex items-center h-16 px-5 max-w-md mx-auto left-0 right-0">
        <div className="flex items-center gap-3 flex-1">
          <span className="material-symbols-outlined text-primary">analytics</span>
          <h1 className="font-sans text-base font-bold text-primary">职投 Copilot</h1>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
          title="退出登录"
          aria-label="退出登录"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="pt-20 pb-28 px-5 max-w-md mx-auto space-y-6">
        {/* User Card */}
        <section className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
          <div className="p-5 flex flex-col items-center">
            <div className="w-full flex justify-between items-start mb-4">
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-outline font-sans border border-outline-variant py-1.5 px-3 rounded-lg"
                >
                  取消
                </button>
              ) : (
                <button
                  onClick={() => {
                    setDraftProfile(profile);
                    setIsEditing(true);
                  }}
                  className="text-primary font-sans text-xs font-semibold flex items-center gap-1 py-1.5 px-3 hover:bg-primary-container/10 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  编辑资料
                </button>
              )}

              <div className="w-16 h-16 rounded-full border-2 border-primary-container p-0.5">
                <img
                  alt="User Avatar"
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhVvbhzdv2_Zj6kQI2AlaxTwloQKzjuswUA4Tp6ImcVKZPaekwpGiiBn9-_FikYBYkZbOv6dCu6cIOcmsyff0fkUPp68MUytfvJ35VwDAIkoDkQj4_jGfy5m0y_2_lNkGAZ-gmDSaE-4nn_sILyllQjBfJsNQy7ElsPi_mVjd1gWCkIisL-aVFVrwnSjo_DzFpmzv5UbLUBr7N42Q2zIIbcdyNxc2ExnelOaABk9hz2rJdOz3x7-ReIA"
                />
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="w-full space-y-3 mb-2 animate-fade-in-up">
                <div>
                  <label htmlFor="user-name-input" className="block text-[10px] font-mono text-outline uppercase">姓名</label>
                  <input
                    id="user-name-input"
                    type="text"
                    value={draftProfile.name}
                    onChange={(e) => updateDraft("name", e.target.value)}
                    className="w-full text-xs font-sans p-2 border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                    placeholder="姓名"
                  />
                </div>
                <div>
                  <label htmlFor="job-mode-select" className="block text-[10px] font-mono text-outline uppercase font-semibold">求职身份</label>
                  <select
                    id="job-mode-select"
                    value={draftProfile.jobMode}
                    onChange={(e) => updateDraft("jobMode", e.target.value)}
                    className="w-full text-xs font-sans p-2 border border-outline-variant rounded-md bg-white focus:ring-1 focus:ring-primary"
                  >
                    {jobModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-outline uppercase font-semibold">求职偏好</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {draftProfile.targetDirections.map((direction) => (
                      <button
                        key={direction}
                        type="button"
                        onClick={() => removeDirection(direction)}
                        className="px-2.5 py-1 rounded-lg bg-primary-container/15 text-primary text-[10px] font-mono font-bold flex items-center gap-1"
                        title="点击删除该方向"
                      >
                        {directionLabel(direction)}
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] font-mono text-outline font-semibold uppercase">职位类别</p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {jobPreferenceOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleMainCategory(option.value)}
                        className={`h-8 rounded-lg border text-[10px] font-bold transition-colors ${
                          draftProfile.targetDirections.includes(option.value)
                            ? "border-primary bg-primary-container/20 text-primary"
                            : "border-border-subtle bg-white text-on-surface-variant"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {availableSubDirections.length > 0 && (
                    <>
                      <p className="mt-3 text-[10px] font-mono text-outline font-semibold uppercase">岗位方向</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {availableSubDirections.map((direction) => (
                          <button
                            key={direction}
                            type="button"
                            onClick={() => toggleSubDirection(direction)}
                            className={`min-h-8 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${
                              draftProfile.targetDirections.includes(direction)
                                ? "border-primary bg-primary-container/20 text-primary"
                                : "border-border-subtle bg-white text-on-surface-variant"
                            }`}
                          >
                            {direction}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="mt-3">
                    <label htmlFor="target-keywords-input" className="block text-[10px] font-mono text-outline uppercase font-semibold">
                      目标岗位关键词
                    </label>
                    <input
                      id="target-keywords-input"
                      value={draftProfile.customTargetDirection}
                      onChange={(e) => updateDraft("customTargetDirection", e.target.value)}
                      className="mt-1 w-full text-xs font-sans p-2 border border-outline-variant rounded-md focus:ring-1 focus:ring-primary"
                      placeholder="例如：智能模型数据平台工程师-AI Data、AI Agent 评测实习生"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="language-select" className="block text-[10px] font-mono text-outline uppercase font-semibold">语言</label>
                    <select
                      id="language-select"
                      value={draftProfile.language}
                      onChange={(e) => updateDraft("language", e.target.value as BackendProfile["language"])}
                      className="w-full text-xs font-sans p-2 border border-outline-variant rounded-md bg-white"
                    >
                      <option value="zh-CN">中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="question-count-input" className="block text-[10px] font-mono text-outline uppercase font-semibold">题目数</label>
                    <input
                      id="question-count-input"
                      type="number"
                      min={1}
                      max={20}
                      value={draftProfile.questionCount}
                      onChange={(e) => updateDraft("questionCount", Number(e.target.value))}
                      className="w-full text-xs font-sans p-2 border border-outline-variant rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <ToggleField
                    label="语音输入"
                    checked={draftProfile.enableVoiceInput}
                    onChange={(checked) => updateDraft("enableVoiceInput", checked)}
                  />
                  <ToggleField
                    label="STAR 提示"
                    checked={draftProfile.showStarTips}
                    onChange={(checked) => updateDraft("showStarTips", checked)}
                  />
                </div>

                {profileError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {profileError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isProfileSaving}
                  className="w-full py-2 bg-primary text-white font-bold text-xs rounded-md shadow-sm active:scale-95 transition-transform disabled:opacity-60"
                >
                  {isProfileSaving ? "保存中" : "保存修改"}
                </button>
                <button
                  type="button"
                  onClick={handleClearProfile}
                  disabled={isProfileSaving}
                  className="w-full py-2 border border-red-200 text-red-600 bg-red-50 font-bold text-xs rounded-md disabled:opacity-60"
                >
                  清空个人资料
                </button>
              </form>
            ) : (
              <div className="text-center animate-fade-in-up">
                <h2 className="font-sans text-xl font-extrabold text-on-surface">{displayName}</h2>
                <p className="font-mono text-[10px] text-on-surface-variant font-bold mt-1 uppercase tracking-widest">
                  {isProfileLoading ? "Loading profile..." : displayTitle}
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {profile.targetDirections.map((direction) => (
                    <span key={direction} className="px-2 py-1 rounded bg-primary-container/15 text-primary text-[9px] font-mono font-bold">
                      {directionLabel(direction)}
                    </span>
                  ))}
                  {profile.customTargetDirection && (
                    <span className="px-2 py-1 rounded bg-tertiary-container/25 text-on-tertiary-container text-[9px] font-mono font-bold">
                      {profile.customTargetDirection}
                    </span>
                  )}
                </div>
                {profileError && (
                  <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {profileError}
                  </p>
                )}
              </div>
            )}

            {/* Resume Metas Grid */}
            <div className="grid grid-cols-3 w-full mt-6 border-t border-dashed border-border-subtle pt-5 text-center">
              <div>
                <p className="font-sans text-xl font-bold text-primary">{deliveryCount}</p>
                <p className="font-mono text-[9px] font-semibold text-on-surface-variant tracking-wider uppercase mt-0.5">
                  投递记录
                </p>
              </div>
              <div className="border-x border-border-subtle">
                <p className="font-sans text-xl font-bold text-primary">0</p>
                <p className="font-mono text-[9px] font-semibold text-on-surface-variant tracking-wider uppercase mt-0.5">
                  匹配评分
                </p>
              </div>
              <div>
                <p className="font-sans text-xl font-bold text-primary">{interviewCount}</p>
                <p className="font-mono text-[9px] font-semibold text-on-surface-variant tracking-wider uppercase mt-0.5">
                  面试邀约
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Resume Assets */}
        <section id="resumes-assets-list" className="space-y-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-sans text-base font-bold text-on-surface">我的简历资产</h3>
            <button
              onClick={openFilePicker}
              disabled={isUploading}
              className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm hover:scale-105 active:scale-90 transition-all cursor-pointer"
              title="上传新简历"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
          />

          <div className="space-y-3">
            {resumes.map((res) => (
              <div
                key={res.id}
                className="relative overflow-hidden rounded-xl"
              >
                <button
                  type="button"
                  onClick={() => handleDeleteResume(res.id)}
                  disabled={deletingResumeId === res.id}
                  className="absolute inset-y-0 right-0 w-20 bg-red-500 text-white flex items-center justify-center font-sans text-xs font-bold disabled:opacity-60"
                >
                  {deletingResumeId === res.id ? "删除中" : "删除"}
                </button>
                <div
                  onTouchStart={(event) => {
                    touchStartX.current = event.touches[0]?.clientX ?? 0;
                  }}
                  onTouchEnd={(event) => {
                    const endX = event.changedTouches[0]?.clientX ?? 0;
                    const deltaX = endX - touchStartX.current;

                    if (deltaX < -36) {
                      setSwipedResumeId(res.id);
                    } else if (deltaX > 24) {
                      setSwipedResumeId(null);
                    }
                  }}
                  className={`relative bg-white border border-border-subtle hover:border-primary-container rounded-xl p-4 flex justify-between items-center group transition-transform duration-200 ${
                    swipedResumeId === res.id ? "-translate-x-20" : "translate-x-0"
                  }`}
                >
                  <div className="flex gap-3 items-center min-w-0">
                    <div className="w-10 h-10 bg-zinc-100 rounded flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-[24px]">description</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 pr-2">
                        <h4 className="min-w-0 flex-1 font-sans text-xs font-bold text-on-surface truncate">
                          {res.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => openRenameDialog(res)}
                          className="shrink-0 w-6 h-6 rounded-full text-primary flex items-center justify-center hover:bg-primary-container/15 active:scale-95 transition-colors"
                          title="编辑简历名称"
                          aria-label={`编辑 ${res.name} 的名称`}
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[9px] text-on-surface-variant">
                          更新: {res.lastUpdated}
                        </span>
                        {res.tag && (
                          <>
                            <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
                            <span className="bg-tertiary-container/25 text-on-tertiary-container px-1.5 py-0.5 rounded text-[8px] font-bold">
                              {res.tag}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 text-on-surface-variant">
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(`确定删除「${res.name}」吗？删除后会同步移除数据库记录。`);
                        if (confirmed) {
                          void handleDeleteResume(res.id);
                        }
                      }}
                      disabled={deletingResumeId === res.id}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 hover:text-red-500 disabled:opacity-60 transition-colors"
                      title="删除简历"
                      aria-label={`删除 ${res.name}`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {deletingResumeId === res.id ? "progress_activity" : "delete"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePreviewResume(res)}
                      disabled={previewingResumeId === res.id}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 hover:text-primary disabled:opacity-60 transition-colors"
                      title="预览 PDF 简历"
                      aria-label={`预览 ${res.name}`}
                    >
                      <span className={`material-symbols-outlined text-lg ${previewingResumeId === res.id ? "animate-spin" : ""}`}>
                        {previewingResumeId === res.id ? "progress_activity" : "chevron_right"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Action Box: Import Local */}
            <button
              type="button"
              onClick={openFilePicker}
              disabled={isUploading}
              className="w-full border-2 border-dashed border-border-subtle rounded-xl p-5 flex flex-col items-center justify-center gap-1 text-on-surface-variant hover:border-primary-container hover:text-primary transition-all cursor-pointer bg-white/40 hover:bg-primary-container/5 active:scale-98 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[32px] text-zinc-400 group-hover:text-primary">
                {isUploading ? "progress_activity" : "upload_file"}
              </span>
              <span className="font-sans text-xs font-bold mt-1">
                {isUploading ? "正在上传简历" : "从本地导入新简历"}
              </span>
              <p className="text-[9px] text-outline font-medium">支持 PDF, Word, Markdown 格式</p>
            </button>
            {uploadError && (
              <p className="text-xs text-on-tertiary-container bg-amber-50 border border-tertiary-container/25 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            )}
          </div>
        </section>

        {/* Assets Data Statistics */}
        <section id="assets-analytics-visuals" className="space-y-3">
          <h3 className="font-mono text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            资产分析 (Data Assets)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-xl border border-border-subtle">
              <p className="font-mono text-[10px] text-on-surface-variant mb-1 font-semibold">
                简历健康度
              </p>
              <div className="flex items-end gap-1">
                <span className="font-sans text-xl font-bold text-primary">{averageWellness}</span>
                <span className="font-mono text-[10px] text-on-surface-variant mb-1">%</span>
              </div>
              <div className="w-full bg-zinc-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-primary-container h-full rounded-full" style={{ width: `${averageWellness}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-border-subtle">
              <p className="font-mono text-[10px] text-on-surface-variant mb-1 font-semibold">
                关键词覆盖
              </p>
              <div className="flex items-end gap-1">
                <span className="font-sans text-xl font-bold text-secondary">{keywordTotal}</span>
                <span className="font-mono text-[10px] text-on-surface-variant mb-1">UNIT</span>
              </div>
              <div className="w-full bg-zinc-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-secondary-container h-full rounded-full" style={{ width: `${Math.min(keywordTotal, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {pdfPreview && (
        <PdfPreviewModal
          preview={pdfPreview}
          onClose={closePdfPreview}
        />
      )}

      {renameResume && (
        <ResumeRenameDialog
          value={renameValue}
          resumeName={renameResume.name}
          isSaving={isRenaming}
          onChange={setRenameValue}
          onCancel={closeRenameDialog}
          onSubmit={handleRenameSubmit}
        />
      )}
    </div>
  );
}

function ResumeRenameDialog({
  value,
  resumeName,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: string;
  resumeName: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] bg-black/45 px-5 flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-white border border-border-subtle shadow-2xl overflow-hidden">
        <div className="border-b border-border-subtle px-4 py-3">
          <h3 className="font-sans text-sm font-extrabold text-on-surface">编辑简历名称</h3>
          <p className="mt-1 text-[10px] text-on-surface-variant truncate">{resumeName}</p>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <span className="font-mono text-[10px] font-bold text-outline uppercase">文件名</span>
            <input
              autoFocus
              value={value}
              onChange={(event) => onChange(event.target.value)}
              maxLength={100}
              className="mt-1 h-11 w-full rounded-xl border border-border-subtle px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
              placeholder="例如：杨子泰-后端开发简历.pdf"
            />
          </label>
        </div>
        <div className="border-t border-border-subtle p-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="h-11 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface-variant disabled:opacity-60"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSaving || !value.trim()}
            className="h-11 rounded-xl bg-primary text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSaving ? "animate-spin" : ""}`}>
              {isSaving ? "progress_activity" : "check"}
            </span>
            {isSaving ? "保存中" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PdfPreviewModal({
  preview,
  onClose,
}: {
  preview: PdfPreviewState;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md h-[88vh] sm:h-[86vh] rounded-t-2xl sm:rounded-2xl bg-white border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
        <div className="shrink-0 h-14 border-b border-border-subtle px-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-sans text-sm font-extrabold text-on-surface truncate">简历 PDF 预览</h3>
            <p className="mt-0.5 text-[10px] text-on-surface-variant truncate">{preview.resumeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center active:scale-95"
            aria-label="关闭简历预览"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-zinc-100">
          <iframe
            src={preview.url}
            title={`预览 ${preview.resumeName}`}
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2">
      <span className="text-[10px] font-bold text-on-surface-variant">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-4 h-4 rounded text-primary focus:ring-primary"
      />
    </label>
  );
}

function normalizeProfile(value: BackendProfile): BackendProfile {
  const targetDirections = normalizeDirections(value.targetDirections, value.targetDirection);
  return {
    ...defaultProfile,
    ...value,
    name: value.name ?? "",
    customTargetDirection: value.customTargetDirection ?? "",
    targetDirections,
    targetDirection: value.targetDirection || targetDirections[0],
    questionCount: Math.min(20, Math.max(1, Number(value.questionCount) || 5)),
  };
}

function normalizeDirections(value: string[], primary?: string) {
  const migratedItems = [...value, primary].flatMap((item) => {
    if (!item) return [];
    return legacyDirectionMap[item] ?? [item];
  });
  const items = migratedItems
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  const uniqueItems = [...new Set(items)];
  return uniqueItems.length ? uniqueItems : ["研发"];
}

function directionLabel(value: string) {
  return jobPreferenceLabels[value] ?? value;
}

function isPdfResume(resume: Resume) {
  return /\.pdf($|\?)/i.test(resume.fileUrl ?? "") || /\.pdf$/i.test(resume.name);
}

function toAbsoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function jobModeLabel(value: string) {
  return jobModeOptions.find((option) => option.value === value)?.label ?? "求职者";
}

function buildProfileTitle(profile: BackendProfile) {
  const directions = profile.targetDirections.map(directionLabel).slice(0, 4).join(" / ");
  const custom = profile.customTargetDirection ? ` · ${profile.customTargetDirection}` : "";
  return `${jobModeLabel(profile.jobMode)} · ${directions}${custom}`;
}
