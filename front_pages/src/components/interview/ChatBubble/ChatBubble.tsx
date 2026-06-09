import clsx from "clsx";

import type { InterviewMessage } from "@/features/interview/types";

import styles from "./ChatBubble.module.css";

type ChatBubbleProps = {
  message: InterviewMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <div className={clsx(styles.row, styles[message.role])}>
      {message.role === "assistant" ? <span className={styles.avatar}>AI</span> : null}
      <div className={styles.bubble}>{message.content}</div>
    </div>
  );
}
