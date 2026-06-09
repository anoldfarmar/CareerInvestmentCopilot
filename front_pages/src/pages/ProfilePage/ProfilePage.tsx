import { Button, Selector, Switch, Toast } from "antd-mobile";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import { ProfileHeader } from "@/components/profile/ProfileHeader/ProfileHeader";
import type { JobMode, TargetDirection, UserProfile } from "@/features/profile/types";
import { useProfile, useUpdateProfile } from "@/features/profile/hooks";
import { useAuthStore } from "@/stores/authStore";

const modeOptions = [
  { label: "应届生模式", value: "student" },
  { label: "转行模式", value: "career-switcher" },
  { label: "有经验求职者", value: "experienced" },
];

const directionOptions = [
  { label: "技术岗", value: "tech" },
  { label: "产品岗", value: "product" },
  { label: "运营岗", value: "operation" },
  { label: "数据分析", value: "data" },
  { label: "设计岗", value: "design" },
  { label: "市场岗", value: "marketing" },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { data, isLoading, isError, refetch } = useProfile();
  const updateMutation = useUpdateProfile();
  const { reset, watch, setValue, handleSubmit } = useForm<UserProfile>();
  const values = watch();

  useEffect(() => {
    if (data) reset({ ...data, name: user?.name || data.name });
  }, [data, reset, user?.name]);

  async function onSubmit(profile: UserProfile) {
    await updateMutation.mutateAsync(profile);
    Toast.show("偏好已保存");
  }

  if (!user) {
    return (
      <AppShell title="我的">
        <section className="card page-stack" style={{ textAlign: "center" }}>
          <UserRound size={42} style={{ margin: "0 auto" }} color="var(--color-primary)" />
          <strong>登录后使用完整功能</strong>
          <p className="muted" style={{ margin: 0 }}>
            上传简历、模拟面试和复盘报告等功能需要登录后使用。
          </p>
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
              <p className="muted" style={{ marginBottom: 0 }}>
                {user.email}
              </p>
            </div>
            <UserRound color="var(--color-primary)" />
          </div>
        </section>

        {isLoading ? <LoadingState text="正在加载个人配置" /> : null}
        {isError ? <ErrorState title="个人配置加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
        {values ? (
          <form className="page-stack" onSubmit={handleSubmit(onSubmit)}>
            <ProfileHeader profile={values} />
            <section className="card page-stack">
              <strong>求职身份</strong>
              <Selector
                multiple={false}
                value={[values.jobMode]}
                options={modeOptions}
                onChange={(value) => setValue("jobMode", (value[0] as JobMode) ?? "experienced")}
              />
            </section>
            <section className="card page-stack">
              <strong>目标方向</strong>
              <Selector
                multiple={false}
                value={[values.targetDirection]}
                options={directionOptions}
                onChange={(value) => setValue("targetDirection", (value[0] as TargetDirection) ?? "tech")}
              />
            </section>
            <section className="card page-stack">
              <strong>训练偏好</strong>
              <Selector
                multiple={false}
                value={[values.language]}
                options={[
                  { label: "中文", value: "zh-CN" },
                  { label: "英文", value: "en-US" },
                ]}
                onChange={(value) => setValue("language", (value[0] as "zh-CN" | "en-US") ?? "zh-CN")}
              />
              <Selector
                multiple={false}
                value={[String(values.questionCount)]}
                options={[
                  { label: "5 题", value: "5" },
                  { label: "8 题", value: "8" },
                  { label: "10 题", value: "10" },
                ]}
                onChange={(value) => setValue("questionCount", Number(value[0]) as 5 | 8 | 10)}
              />
              <div className="row">
                <span>默认语音输入</span>
                <Switch checked={values.enableVoiceInput} onChange={(checked) => setValue("enableVoiceInput", checked)} />
              </div>
              <div className="row">
                <span>显示 STAR 提示</span>
                <Switch checked={values.showStarTips} onChange={(checked) => setValue("showStarTips", checked)} />
              </div>
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
