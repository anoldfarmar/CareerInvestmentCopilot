import type { UserProfile } from "@/features/profile/types";

export function ProfileHeader({ profile }: { profile: UserProfile }) {
  return (
    <section className="card row">
      <div>
        <h1 style={{ margin: 0, fontSize: 20 }}>{profile.name}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          默认 {profile.questionCount} 题 · {profile.language === "zh-CN" ? "中文面试" : "英文面试"}
        </p>
      </div>
      <span
        style={{
          width: 54,
          height: 54,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          color: "#fff",
          background: "linear-gradient(135deg, #165dff, #00b42a)",
          fontWeight: 800,
        }}
      >
        AI
      </span>
    </section>
  );
}
