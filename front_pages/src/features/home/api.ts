import { http } from "@/services/http";

import { mockHomeOverview } from "./mock";
import type { HomeOverview } from "./types";

export async function getHomeOverview(): Promise<HomeOverview> {
  const token = window.localStorage.getItem("token");
  if (!token) {
    return mockHomeOverview;
  }

  const { data } = await http.get<HomeOverview>("/overview");
  return data;
}
