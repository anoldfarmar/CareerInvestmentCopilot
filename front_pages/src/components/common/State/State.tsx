import { Button, SpinLoading } from "antd-mobile";
import { AlertCircle, Inbox } from "lucide-react";

import "@/styles/utilities.css";

type LoadingStateProps = {
  text?: string;
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

export function EmptyState({ title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="state-card">
      <Inbox size={32} />
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {actionText ? (
        <Button color="primary" size="small" onClick={onAction}>
          {actionText}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({ title, description, actionText = "重试", onAction }: ErrorStateProps) {
  return (
    <div className="state-card state-card--danger">
      <AlertCircle size={32} />
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      <Button color="primary" size="small" onClick={onAction}>
        {actionText}
      </Button>
    </div>
  );
}
