"use client";

import { useEffect, useState } from "react";
import { DatabaseZap } from "lucide-react";
import { getProviderStatus } from "@/lib/api";
import type { ProviderStatus } from "@/lib/types";
import { IconBadge } from "./ui";

export function ProviderStatusBadge() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    getProviderStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) {
    return <IconBadge icon={DatabaseZap}>Memory Provider: unavailable</IconBadge>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <IconBadge icon={DatabaseZap} tone={status.activeProvider === "hindsight" ? "purple" : "blue"}>
        Memory Provider: {status.activeProvider}
      </IconBadge>
      <IconBadge tone={status.hindsightConfigured ? "green" : "orange"}>Hindsight Configured: {String(status.hindsightConfigured)}</IconBadge>
    </div>
  );
}
