import { QueryProvider } from "./providers/QueryProvider";
import { AppRouterProvider } from "./providers/RouterProvider";
import { ThemeProvider } from "./providers/ThemeProvider";

export function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AppRouterProvider />
      </QueryProvider>
    </ThemeProvider>
  );
}
