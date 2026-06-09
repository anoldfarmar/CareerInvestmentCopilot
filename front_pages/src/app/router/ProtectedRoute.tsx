import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { useAuthStore } from "@/stores/authStore";

// 类似前端路由守卫：未登录用户访问受限页面时，统一跳转到登录页。
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`${routePaths.auth}?redirect=${redirect}`} replace />;
  }

  return children;
}
