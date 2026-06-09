import { Button } from "antd-mobile";
import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./FeatureActionCard.module.css";

type FeatureActionCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  variant: "primary" | "success" | "accent";
  onClick: () => void;
};

export function FeatureActionCard({
  icon,
  title,
  description,
  buttonText,
  variant,
  onClick,
}: FeatureActionCardProps) {
  return (
    <article className={styles.card}>
      <div className={clsx(styles.icon, styles[variant])}>{icon}</div>
      <div className={styles.body}>
        <h3>{title}</h3>
        <p>{description}</p>
        <Button color="primary" size="small" fill="outline" onClick={onClick}>
          {buttonText}
        </Button>
      </div>
    </article>
  );
}
