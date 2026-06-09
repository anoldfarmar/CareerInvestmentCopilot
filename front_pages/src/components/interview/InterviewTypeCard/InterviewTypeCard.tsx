import clsx from "clsx";
import type { ReactNode } from "react";

import type { InterviewType } from "@/features/interview/types";

import styles from "./InterviewTypeCard.module.css";

type InterviewTypeCardProps = {
  icon: ReactNode;
  type: InterviewType;
  title: string;
  description: string;
  selected: boolean;
  onSelect: (type: InterviewType) => void;
};

export function InterviewTypeCard({ icon, type, title, description, selected, onSelect }: InterviewTypeCardProps) {
  return (
    <button type="button" className={clsx(styles.card, selected && styles.selected)} onClick={() => onSelect(type)}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.text}>
        <strong>{title}</strong>
        <em>{description}</em>
      </span>
    </button>
  );
}
