import { Button } from "antd-mobile";
import { useNavigate, useParams } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";

export function ResumeSuggestionsPage() {
  const { resumeId } = useParams();
  const navigate = useNavigate();

  return (
    <AppShell title="简历优化建议" showBack showTabBar={false}>
      <section className="card page-stack">
        <strong>简历优化流程已升级</strong>
        <p className="muted" style={{ lineHeight: 1.7 }}>
          旧版建议页只服务于早期 mock 流程。现在新版工作台已经支持上传解析、结构化、JD 定向优化、优化稿编辑、保存和 PDF 导出。
        </p>
        {resumeId ? <span className="pill">旧简历参数：{resumeId}</span> : null}
        <Button block color="primary" onClick={() => navigate(routePaths.resumeOptimize, { replace: true })}>
          返回新版简历优化工作台
        </Button>
      </section>
    </AppShell>
  );
}
