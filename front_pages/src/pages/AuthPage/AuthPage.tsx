import { Button, Input, Toast } from "antd-mobile";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { login, register } from "@/features/auth/api";
import { useAuthStore } from "@/stores/authStore";

type AuthMode = "login" | "register";

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password) {
      Toast.show("请填写邮箱和密码");
      return;
    }

    if (password.length < 8) {
      Toast.show("密码至少需要 8 个字符");
      return;
    }

    try {
      setLoading(true);
      const response =
        mode === "login"
          ? await login({ email: email.trim(), password })
          : await register({ email: email.trim(), password, name: name.trim() || undefined });
      setAuth(response);
      Toast.show(mode === "login" ? "登录成功" : "注册成功");
      navigate(searchParams.get("redirect") || routePaths.profile, { replace: true });
    } catch {
      Toast.show(mode === "login" ? "登录失败，请检查邮箱和密码" : "注册失败，请检查邮箱是否已使用");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title={mode === "login" ? "登录" : "注册"} showBack showTabBar={false}>
      <section className="card page-stack">
        <div>
          <strong>{mode === "login" ? "欢迎回来" : "创建账号"}</strong>
          <p className="muted">登录后才能上传简历并使用 AI 求职助手。</p>
        </div>

        {mode === "register" ? (
          <Input placeholder="姓名（可选）" value={name} onChange={setName} clearable />
        ) : null}
        <Input placeholder="邮箱" value={email} onChange={setEmail} clearable />
        <Input placeholder="密码，至少 8 个字符" type="password" value={password} onChange={setPassword} clearable />

        <Button block color="primary" loading={loading} onClick={() => void handleSubmit()}>
          {mode === "login" ? "登录" : "注册并登录"}
        </Button>
        <Button block fill="none" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "还没有账号？立即注册" : "已有账号？返回登录"}
        </Button>
      </section>
    </AppShell>
  );
}
