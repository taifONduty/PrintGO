"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { StatusPoller } from "@/components/StatusPoller";

export default function StatusPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  // End of flow — no back button; all rail buckets are complete.
  return (
    <AppShell step={5} showRail>
      <StatusPoller jobId={jobId} onReset={() => router.push("/upload")} />
    </AppShell>
  );
}
