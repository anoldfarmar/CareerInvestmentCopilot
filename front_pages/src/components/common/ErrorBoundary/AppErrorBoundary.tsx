import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "antd-mobile";
import { AlertCircle } from "lucide-react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-boundary">
          <section className="card state-card state-card--danger fade-in">
            <span className="state-icon">
              <AlertCircle size={28} />
            </span>
            <strong>页面加载遇到问题</strong>
            <p>可能是网络波动或版本更新导致资源加载失败，请刷新后重试。</p>
            <Button color="primary" onClick={this.handleReload}>
              刷新页面
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
