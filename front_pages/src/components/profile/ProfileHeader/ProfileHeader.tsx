import type { UserProfile } from "@/features/profile/types";

export function ProfileHeader({ profile }: { profile: UserProfile }) {
  const planLabel = profile.subscription?.planLabel ?? "免费版";

  return (
    <section className="card row">
      <div>
        <h1 className="text-title">{profile.name}</h1>
        <p className="muted mt-2">
          默认 {profile.questionCount} 题 · {profile.language === "zh-CN" ? "中文面试" : "英文面试"} · {planLabel}
        </p>
      </div>
      <span className="icon-badge icon-badge--lg">AI</span>
    </section>
  );
}
