import { Button, Tabs, Toast } from "antd-mobile";
import { useParams } from "react-router-dom";

import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import { useResumeCompare } from "@/features/resume/hooks";

export function ResumeComparePage() {
  const { resumeId = "resume_001" } = useParams();
  const { data, isLoading, isError, refetch } = useResumeCompare(resumeId);

  return (
    <AppShell title="简历预览" showBack showTabBar={false}>
      {isLoading ? <LoadingState text="正在生成优化对比" /> : null}
      {isError ? <ErrorState title="简历对比加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <section className="card">
            <Tabs>
              <Tabs.Tab title="优化前" key="before">
                <div className="page-stack" style={{ marginTop: 14 }}>
                  {data.sections.map((section) => (
                    <article key={section.title}>
                      <strong>{section.title}</strong>
                      {section.before.map((line) => (
                        <p className="muted" key={line}>
                          {line}
                        </p>
                      ))}
                    </article>
                  ))}
                </div>
              </Tabs.Tab>
              <Tabs.Tab title="优化后" key="after">
                <div className="page-stack" style={{ marginTop: 14 }}>
                  {data.sections.map((section) => (
                    <article key={section.title}>
                      <strong>{section.title}</strong>
                      {section.after.map((line) => (
                        <p key={line} style={{ padding: 8, borderRadius: 10, background: "var(--color-success-light)" }}>
                          {line}
                        </p>
                      ))}
                    </article>
                  ))}
                </div>
              </Tabs.Tab>
              <Tabs.Tab title="对比" key="compare">
                <div className="page-stack" style={{ marginTop: 14 }}>
                  {data.sections.map((section) => (
                    <article className="card" key={section.title} style={{ boxShadow: "none" }}>
                      <strong>{section.title}</strong>
                      <p style={{ background: "var(--color-danger-light)", padding: 8, borderRadius: 10 }}>
                        - {section.before[0]}
                      </p>
                      <p style={{ background: "var(--color-success-light)", padding: 8, borderRadius: 10 }}>
                        + {section.after[0]}
                      </p>
                      <span className="pill">{section.highlight}</span>
                    </article>
                  ))}
                </div>
              </Tabs.Tab>
            </Tabs>
          </section>
          <div className="fixed-actions">
            <Button
              block
              color="primary"
              onClick={() => {
                Toast.show("已应用全部优化");
              }}
            >
              应用全部优化
            </Button>
            <Button
              block
              fill="outline"
              onClick={() => {
                Toast.show("导出接口已预留");
              }}
            >
              导出优化版本
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
