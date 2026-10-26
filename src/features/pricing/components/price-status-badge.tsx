import { Badge } from "@/components/ui/badge";
import { getMessages } from "@/i18n";
import type { PriceStatus } from "../types";

const TONES = { current: "success", stale: "warning", estimated: "neutral" } as const;

export function PriceStatusBadge({ status }: { status: PriceStatus }) {
  return (
    <Badge tone={TONES[status]} data-price-status={status}>
      {getMessages().pricing.status[status]}
    </Badge>
  );
}
