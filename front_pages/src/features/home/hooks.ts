import { useQuery } from "@tanstack/react-query";

import { getHomeOverview } from "./api";

export function useHomeOverview() {
  return useQuery({ queryKey: ["home", "overview"], queryFn: getHomeOverview });
}
