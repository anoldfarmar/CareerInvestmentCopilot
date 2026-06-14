import { AppErrorBoundary } from "@/components/common/ErrorBoundary/AppErrorBoundary";

import { QueryProvider } from "./providers/QueryProvider";
import { AppRouterProvider } from "./providers/RouterProvider";
import { ThemeProvider } from "./providers/ThemeProvider";

export function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <AppRouterProvider />
        </QueryProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
