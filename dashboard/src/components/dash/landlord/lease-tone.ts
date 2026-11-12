import type { LeaseStatus } from "@/lib/types";
import type { Tone } from "@/lib/types";

export const LEASE_TONE: Record<LeaseStatus, Tone> = {
  active: "success",
  expiring_soon: "warning",
  upcoming: "info",
  terminated: "neutral",
};
