import type { LinkStatus } from "@/features/link/types";

import { linkStatusLabels } from "./linkStatusLabels";

export function LinkStatusTag({ status }: { status: LinkStatus }) {
  return <span className="pill">{linkStatusLabels[status]}</span>;
}
