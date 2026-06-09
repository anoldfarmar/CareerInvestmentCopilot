import { BarChart3, FileText, Home, Mic, UserRound } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";

import styles from "./BottomTabBar.module.css";

const tabs = [
  { key: "home", label: "首页", path: routePaths.home, icon: Home },
  { key: "resume", label: "简历", path: routePaths.resumeOptimize, icon: FileText },
  { key: "interview", label: "面试", path: routePaths.interviewSetup, icon: Mic },
  { key: "report", label: "复盘", path: routePaths.reportList, icon: BarChart3 },
  { key: "profile", label: "我的", path: routePaths.profile, icon: UserRound },
] as const;

function isActive(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  return pathname.startsWith(path.split("/").slice(0, 2).join("/"));
}

export function BottomTabBar() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.tabbar} aria-label="底部导航">
      <div className={styles.inner}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.path);
          return (
            <NavLink
              key={tab.key}
              to={tab.path}
              className={active ? styles.activeItem : styles.item}
              aria-label={tab.label}
            >
              <Icon size={21} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
