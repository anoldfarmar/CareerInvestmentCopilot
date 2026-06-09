import { Button } from "antd-mobile";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <AppShell title="页面不存在" showBack showTabBar={false}>
      <section className="state-card">
        <strong>404</strong>
        <p>这个页面暂时不可访问，可以回到首页继续求职准备。</p>
        <Button color="primary" onClick={() => navigate(routePaths.home)}>
          回到首页
        </Button>
      </section>
    </AppShell>
  );
}
