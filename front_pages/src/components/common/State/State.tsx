import { Button, SpinLoading } from "antd-mobile";
import { AlertCircle, Inbox } from "lucide-react";

import "@/styles/utilities.css";

type LoadingStateProps = {
  text?: string;
};

type SkeletonStateProps = {
  /** 骨架卡片数量，默认 3 */
  rows?: number;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
};

type ErrorStateProps = EmptyStateProps;

export function LoadingState({ text = "正在加载..." }: LoadingStateProps) {
  return (
    <div className="state-card">
      <SpinLoading color="primary" />
      <p>{text}</p>
    </div>
  );
}

// 列表/卡片型内容的骨架屏，避免纯转圈和数据突现导致的页面跳动。
export function SkeletonState({ rows = 3 }: SkeletonStateProps) {
  return (
    <div className="skeleton-stack" aria-busy="true" aria-label="内容加载中">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-line" style={{ width: "45%" }} />
          <div className="skeleton-line" style={{ width: "90%" }} />
          <div className="skeleton-line" style={{ width: "70%" }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="state-card fade-in">
      <span className="state-icon">
        <Inbox size={28} />
      </span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {actionText ? (
        <Button color="primary" onClick={onAction}>
          {actionText}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({ title, description, actionText = "重试", onAction }: ErrorStateProps) {
  return (
    <div className="state-card state-card--danger fade-in">
      <span className="state-icon">
        <AlertCircle size={28} />
      </span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      <Button color="primary" onClick={onAction}>
        {actionText}
      </Button>
    </div>
  );
}
