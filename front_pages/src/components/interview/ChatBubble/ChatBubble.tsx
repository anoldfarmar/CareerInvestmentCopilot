import clsx from "clsx";

import type { InterviewMessage } from "@/features/interview/types";

import styles from "./ChatBubble.module.css";

type ChatBubbleProps = {
  message: InterviewMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const showQuestionMeta = message.role === "assistant" && (message.sourceLabel || message.difficulty);

  return (
    <div className={clsx(styles.row, styles[message.role])}>
      {message.role === "assistant" ? <span className={styles.avatar}>AI</span> : null}
      <div className={styles.bubble}>
        {showQuestionMeta ? (
          <div className={styles.meta}>
            {message.sourceLabel ? <span>{message.sourceLabel}</span> : null}
            {message.difficulty ? <span>{message.difficulty === "hard" ? "困难" : message.difficulty === "medium" ? "中等" : "简单"}</span> : null}
          </div>
        ) : null}
        {message.content}
      </div>
    </div>
  );
}

// AI 正在出题/思考时的占位气泡，填补等待空窗。
export function TypingBubble() {
  return (
    <div className={clsx(styles.row, styles.assistant)} aria-label="AI 正在输入">
      <span className={styles.avatar}>AI</span>
      <div className={clsx(styles.bubble, styles.typing)}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
