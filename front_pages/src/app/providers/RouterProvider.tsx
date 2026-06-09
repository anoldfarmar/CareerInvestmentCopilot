import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { routes } from "../router/routes";

const router = createBrowserRouter(routes);

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
