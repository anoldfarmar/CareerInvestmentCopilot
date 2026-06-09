import clsx from "clsx";

import type { ResumeSuggestion } from "@/features/resume/types";

import styles from "./SuggestionCard.module.css";

type SuggestionCardProps = {
  suggestion: ResumeSuggestion;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

const severityLabel = {
  high: "高",
  medium: "中",
  low: "低",
};

export function SuggestionCard({ suggestion, selected, onSelect }: SuggestionCardProps) {
  return (
    <button
      type="button"
      className={clsx(styles.card, selected && styles.selected)}
      onClick={() => onSelect?.(suggestion.id)}
    >
      <span className={clsx(styles.badge, styles[suggestion.severity])}>{severityLabel[suggestion.severity]}</span>
      <span className={styles.content}>
        <strong>{suggestion.title}</strong>
        <span>{suggestion.description}</span>
        {suggestion.beforeText || suggestion.afterText ? (
          <span className={styles.compare}>
            {suggestion.beforeText ? <em>原文：{suggestion.beforeText}</em> : null}
            {suggestion.afterText ? <em>建议：{suggestion.afterText}</em> : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}
