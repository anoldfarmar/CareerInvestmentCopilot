import { mockHomeOverview } from "./mock";
import type { HomeOverview } from "./types";

export async function getHomeOverview(): Promise<HomeOverview> {
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  return mockHomeOverview;
}
