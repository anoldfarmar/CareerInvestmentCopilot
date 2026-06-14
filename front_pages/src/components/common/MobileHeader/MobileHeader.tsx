import { Bell, BriefcaseBusiness, ChevronLeft, FileText, Menu, MoreHorizontal, Settings, UserRound } from "lucide-react";
import { Button, Popup, Toast } from "antd-mobile";
import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { useAuthStore } from "@/stores/authStore";

import styles from "./MobileHeader.module.css";

type MobileHeaderProps = {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  rightSlot?: ReactNode;
};

export function MobileHeader({ title, showBack, showMenu, rightSlot }: MobileHeaderProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [menuVisible, setMenuVisible] = useState(false);

  function navigateFromMenu(path: string) {
    setMenuVisible(false);
    navigate(path);
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.side}>
          {showBack ? (
            <button className={styles.iconButton} type="button" aria-label="返回" onClick={() => navigate(-1)}>
              <ChevronLeft size={22} />
            </button>
          ) : showMenu ? (
            <button className={styles.iconButton} type="button" aria-label="菜单" onClick={() => setMenuVisible(true)}>
              <Menu size={21} />
            </button>
          ) : (
            <span className={styles.placeholder} />
          )}
        </div>
        <div className={styles.title}>{title ?? "AI求职助手"}</div>
        <div className={styles.right}>
          {rightSlot ?? (
            <>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="通知"
                onClick={() => Toast.show("通知中心正在准备中")}
              >
                <Bell size={19} />
              </button>
              <button
                className={styles.avatar}
                type="button"
                aria-label="用户头像"
                onClick={() => navigate(routePaths.profile)}
              >
                <UserRound size={16} />
              </button>
            </>
          )}
          {!rightSlot && !showMenu ? null : rightSlot ? null : (
            <button className={styles.iconButton} type="button" aria-label="更多" onClick={() => setMenuVisible(true)}>
              <MoreHorizontal size={18} />
            </button>
          )}
        </div>
      </div>
      <Popup visible={menuVisible} onMaskClick={() => setMenuVisible(false)} position="left" bodyClassName={styles.drawer}>
        <div className={styles.drawerContent}>
          <div>
            <strong>{user?.name || "AI 求职助手"}</strong>
            <p className={styles.drawerHint}>{user?.email || "登录后解锁完整功能"}</p>
          </div>
          <Button block fill="none" onClick={() => navigateFromMenu(routePaths.resumeOptimize)}>
            <FileText size={17} /> 简历优化
          </Button>
          <Button block fill="none" onClick={() => navigateFromMenu(routePaths.jobManage)}>
            <BriefcaseBusiness size={17} /> 岗位/JD 管理
          </Button>
          <Button block fill="none" onClick={() => navigateFromMenu(routePaths.profile)}>
            <Settings size={17} /> 个人求职模式
          </Button>
        </div>
      </Popup>
    </header>
  );
}
