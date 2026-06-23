import React, { useState } from "react";
import { login, register } from "../api/backend";

interface LoginViewProps {
  onAuthenticated: () => Promise<void> | void;
}

export default function LoginView({ onAuthenticated }: LoginViewProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(email.trim(), password, name.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
      await onAuthenticated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "登录失败，请稍后重试";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-root" className="min-h-screen bg-background text-on-surface animate-fade-in-up">
      <header className="h-16 px-5 flex items-center justify-between border-b border-border-subtle bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined filled-icon text-[20px]">workspaces</span>
          </div>
          <h1 className="font-sans text-lg font-bold text-primary">职投 Copilot</h1>
        </div>
        <span className="font-mono text-[10px] text-outline font-bold">SECURE</span>
      </header>

      <main className="px-5 pt-8 pb-12 space-y-6">
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 bg-primary-container/15 text-primary rounded-full px-3 py-1">
            <span className="material-symbols-outlined text-[16px] filled-icon">verified_user</span>
            <span className="font-mono text-[10px] font-bold uppercase">
              {isRegister ? "Create Profile" : "Account Access"}
            </span>
          </div>
          <div>
            <h2 className="font-sans text-3xl font-extrabold text-on-surface leading-tight">
              {isRegister ? "创建求职档案" : "欢迎回来"}
            </h2>
            <p className="font-sans text-sm text-on-surface-variant mt-2 leading-relaxed">
              {isRegister ? "同步简历、岗位和面试复盘记录。" : "继续查看你的投递进展和面试准备状态。"}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-border-subtle rounded-xl p-3 text-center shadow-sm">
            <p className="font-sans text-xl font-extrabold text-primary">JD</p>
            <p className="font-mono text-[9px] text-outline font-bold mt-1">MATCH</p>
          </div>
          <div className="bg-white border border-border-subtle rounded-xl p-3 text-center shadow-sm">
            <p className="font-sans text-xl font-extrabold text-primary">AI</p>
            <p className="font-mono text-[9px] text-outline font-bold mt-1">INTERVIEW</p>
          </div>
          <div className="bg-primary-container border border-primary/10 rounded-xl p-3 text-center shadow-sm">
            <p className="font-sans text-xl font-extrabold text-on-primary-container">CV</p>
            <p className="font-mono text-[9px] text-on-primary-container font-bold mt-1">OPTIMIZE</p>
          </div>
        </section>

        <section className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 border-b border-border-subtle">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`h-12 font-sans text-sm font-bold transition-colors ${
                !isRegister ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`h-12 font-sans text-sm font-bold transition-colors ${
                isRegister ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant"
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {isRegister && (
              <label className="block space-y-1.5" htmlFor="login-name-input">
                <span className="font-mono text-[10px] font-bold text-outline uppercase">Name</span>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline-variant text-[20px] absolute left-3 top-1/2 -translate-y-1/2">
                    badge
                  </span>
                  <input
                    id="login-name-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full h-12 bg-zinc-50 border border-border-subtle rounded-xl pl-10 pr-3 font-sans text-sm focus:ring-2 focus:ring-primary-container/40 focus:border-primary outline-none"
                    placeholder="姓名"
                  />
                </div>
              </label>
            )}

            <label className="block space-y-1.5" htmlFor="login-email-input">
              <span className="font-mono text-[10px] font-bold text-outline uppercase">Email</span>
              <div className="relative">
                <span className="material-symbols-outlined text-outline-variant text-[20px] absolute left-3 top-1/2 -translate-y-1/2">
                  alternate_email
                </span>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full h-12 bg-zinc-50 border border-border-subtle rounded-xl pl-10 pr-3 font-sans text-sm focus:ring-2 focus:ring-primary-container/40 focus:border-primary outline-none"
                  placeholder="xiaoming@example.com"
                  required
                />
              </div>
            </label>

            <label className="block space-y-1.5" htmlFor="login-password-input">
              <span className="font-mono text-[10px] font-bold text-outline uppercase">Password</span>
              <div className="relative">
                <span className="material-symbols-outlined text-outline-variant text-[20px] absolute left-3 top-1/2 -translate-y-1/2">
                  lock
                </span>
                <input
                  id="login-password-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full h-12 bg-zinc-50 border border-border-subtle rounded-xl pl-10 pr-3 font-sans text-sm focus:ring-2 focus:ring-primary-container/40 focus:border-primary outline-none"
                  placeholder={isRegister ? "至少 8 位密码" : "输入密码"}
                  minLength={isRegister ? 8 : undefined}
                  required
                />
              </div>
            </label>

            {error && (
              <div className="border border-tertiary-container/25 bg-amber-50/40 text-on-tertiary-container rounded-xl px-3 py-2 flex gap-2 items-start">
                <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                <p className="font-sans text-xs leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-xl bg-primary text-white font-sans text-base font-extrabold flex items-center justify-center gap-2 shadow-md shadow-primary/10 active:scale-95 disabled:opacity-60 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSubmitting ? "progress_activity" : isRegister ? "person_add" : "login"}
              </span>
              {isSubmitting ? "处理中" : isRegister ? "创建账户" : "进入工作台"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
