import { Button, Input, Selector, Switch, Toast } from "antd-mobile";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import { ProfileHeader } from "@/components/profile/ProfileHeader/ProfileHeader";
import { useProfile, useUpdateProfile } from "@/features/profile/hooks";
import type { JobMode, TargetDirection, UserProfile } from "@/features/profile/types";
import { useAuthStore } from "@/stores/authStore";

const modeOptions = [
  { label: "应届生", value: "student" },
  { label: "1-3 年经验", value: "junior" },
  { label: "3-5 年经验", value: "mid" },
  { label: "5+ 年经验", value: "senior" },
  { label: "转行求职", value: "career-switcher" },
  { label: "创业 / 自由职业", value: "entrepreneur" },
];

const directionOptions = [
  { label: "互联网", value: "internet" },
  { label: "金融", value: "finance" },
  { label: "制造", value: "manufacturing" },
  { label: "医疗", value: "medical" },
  { label: "教育", value: "education" },
  { label: "技术岗", value: "tech" },
  { label: "其他", value: "other" },
];

const fallbackSubscription = {
  plan: "free" as const,
  planLabel: "免费版",
  limits: ["每月 5 场免费模拟面试", "基础复盘报告", "本地知识库记录"],
  benefits: ["无限模拟面试", "专家级复盘建议", "真实面试知识库增强", "简历多模板导出"],
  upgradeEnabled: true,
};

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { data, isLoading, isError, refetch } = useProfile();
  const updateMutation = useUpdateProfile();
  const { reset, watch, setValue, handleSubmit } = useForm<UserProfile>();
  const values = watch();
  const safeValues = values
    ? {
        ...values,
        jobMode: values.jobMode ?? "junior",
        targetDirection: values.targetDirection ?? "internet",
        targetDirections: values.targetDirections ?? ["internet"],
        customTargetDirection: values.customTargetDirection ?? "",
        language: values.language ?? "zh-CN",
        questionCount: values.questionCount ?? 8,
        enableVoiceInput: values.enableVoiceInput ?? true,
        showStarTips: values.showStarTips ?? true,
        subscription: values.subscription ?? fallbackSubscription,
        subscriptionPlan: values.subscriptionPlan ?? values.subscription?.plan ?? "free",
      }
    : undefined;

  useEffect(() => {
    if (data) reset({ ...data, name: user?.name || data.name });
  }, [data, reset, user?.name]);

  async function onSubmit(profile: UserProfile) {
    const targetDirections = profile.targetDirections?.length ? profile.targetDirections : [profile.targetDirection];
    await updateMutation.mutateAsync({
      ...profile,
      targetDirections,
      targetDirection: targetDirections[0],
    });
    Toast.show("偏好已保存");
  }

  if (!user) {
    return (
      <AppShell title="我的">
        <section className="card page-stack text-center">
          <span className="state-icon center-self">
            <UserRound size={28} />
          </span>
          <strong>登录后使用完整功能</strong>
          <p className="muted mt-0">上传简历、模拟面试和复盘报告等功能需要登录后使用。</p>
          <Button block color="primary" onClick={() => navigate(routePaths.auth)}>
            <LogIn size={16} /> 登录或注册
          </Button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="我的">
      <div className="page-stack">
        <section className="card page-stack">
          <div className="row">
            <div>
              <strong>{user.name || "求职助手用户"}</strong>
              <p className="muted mt-0">{user.email}</p>
            </div>
            <UserRound color="var(--color-primary)" />
          </div>
        </section>

        {isLoading ? <LoadingState text="正在加载个人配置" /> : null}
        {isError ? <ErrorState title="个人配置加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
        {safeValues ? (
          <form className="page-stack" onSubmit={handleSubmit(onSubmit)}>
            <ProfileHeader profile={safeValues} />
            <section className="card page-stack">
              <strong>求职身份</strong>
              <p className="muted mt-0">身份会影响默认题目难度和训练建议。</p>
              <Selector
                multiple={false}
                value={[safeValues.jobMode]}
                options={modeOptions}
                onChange={(value) => setValue("jobMode", (value[0] as JobMode) ?? "junior")}
              />
            </section>
            <section className="card page-stack">
              <strong>目标方向</strong>
              <p className="muted mt-0">可多选，后续会影响岗位推荐、默认面试类型和训练重点。</p>
              <Selector
                multiple
                value={safeValues.targetDirections}
                options={directionOptions}
                onChange={(value) => {
                  const next = value as TargetDirection[];
                  setValue("targetDirections", next);
                  setValue("targetDirection", next[0] ?? "internet");
                }}
              />
              <Input
                value={safeValues.customTargetDirection}
                placeholder="自定义方向，例如：AI 教育工具 / 跨境电商"
                onChange={(value) => setValue("customTargetDirection", value)}
              />
            </section>
            <section className="card page-stack">
              <strong>训练偏好</strong>
              <Selector
                multiple={false}
                value={[safeValues.language]}
                options={[
                  { label: "中文", value: "zh-CN" },
                  { label: "英文", value: "en-US" },
                ]}
                onChange={(value) => setValue("language", (value[0] as "zh-CN" | "en-US") ?? "zh-CN")}
              />
              <Selector
                multiple={false}
                value={[String(safeValues.questionCount)]}
                options={[
                  { label: "5 题", value: "5" },
                  { label: "8 题", value: "8" },
                  { label: "10 题", value: "10" },
                ]}
                onChange={(value) => setValue("questionCount", Number(value[0]) as 5 | 8 | 10)}
              />
              <div className="row">
                <span>默认语音输入</span>
                <Switch checked={safeValues.enableVoiceInput} onChange={(checked) => setValue("enableVoiceInput", checked)} />
              </div>
              <div className="row">
                <span>显示 STAR 提示</span>
                <Switch checked={safeValues.showStarTips} onChange={(checked) => setValue("showStarTips", checked)} />
              </div>
            </section>
            <section className="card page-stack">
              <div className="row">
                <strong>版本与订阅</strong>
                <span className="pill">{safeValues.subscription.planLabel}</span>
              </div>
              <div className="profile-plan-grid">
                <section>
                  <strong>当前限制</strong>
                  {safeValues.subscription.limits.map((item) => (
                    <p className="muted" key={item}>
                      {item}
                    </p>
                  ))}
                </section>
                <section>
                  <strong>高级版权益</strong>
                  {safeValues.subscription.benefits.map((item) => (
                    <p className="muted" key={item}>
                      {item}
                    </p>
                  ))}
                </section>
              </div>
              {safeValues.subscription.upgradeEnabled ? (
                <Button
                  block
                  fill="outline"
                  onClick={() => {
                    Toast.show("升级入口已预留，支付/内购接入后可在这里完成转化");
                  }}
                >
                  升级为高级版
                </Button>
              ) : null}
            </section>
            <Button block color="primary" type="submit" loading={updateMutation.isPending}>
              保存偏好
            </Button>
          </form>
        ) : null}

        <Button
          block
          fill="outline"
          color="danger"
          onClick={() => {
            logout();
            navigate(routePaths.profile, { replace: true });
          }}
        >
          <LogOut size={16} /> 退出登录
        </Button>
      </div>
    </AppShell>
  );
}
