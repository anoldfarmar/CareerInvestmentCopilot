import type { HomeKpi } from "@/features/home/types";

import styles from "./KPIGrid.module.css";

type KPIGridProps = {
  items: HomeKpi[];
};

export function KPIGrid({ items }: KPIGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div className={styles.item} key={item.label}>
          <span className={styles.value}>
            {item.value}
            <em>{item.unit}</em>
          </span>
          <span className={styles.label}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
