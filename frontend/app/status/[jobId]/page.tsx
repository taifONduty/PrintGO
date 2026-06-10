"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/Shell";
import { StatusPoller } from "@/components/StatusPoller";

export default function StatusPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  // End of flow — no back button, step rail shows the final "Done" bucket.
  return (
    <AppShell step={3} showRail>
      <StatusPoller jobId={jobId} onReset={() => router.push("/upload")} />
    </AppShell>
  );
}
