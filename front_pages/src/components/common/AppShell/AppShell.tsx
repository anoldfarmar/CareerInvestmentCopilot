import type { ReactNode } from "react";

import { BottomTabBar } from "../BottomTabBar/BottomTabBar";
import { MobileHeader } from "../MobileHeader/MobileHeader";
import styles from "./AppShell.module.css";

type AppShellProps = {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showTabBar?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  title,
  showBack = false,
  showMenu = false,
  showTabBar = true,
  rightSlot,
  children,
}: AppShellProps) {
  return (
    <div className={styles.shell}>
      <MobileHeader title={title} showBack={showBack} showMenu={showMenu} rightSlot={rightSlot} />
      <main className={showTabBar ? styles.main : styles.mainNoTab}>{children}</main>
      {showTabBar ? <BottomTabBar /> : null}
    </div>
  );
}
