import type { ReactNode } from "react";

import { AppShell } from "@/components/common/AppShell/AppShell";

type MobileLayoutProps = {
  title?: string;
  children: ReactNode;
};

export function MobileLayout({ title, children }: MobileLayoutProps) {
  return <AppShell title={title}>{children}</AppShell>;
}
