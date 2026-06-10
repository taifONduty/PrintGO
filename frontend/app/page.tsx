import { redirect } from "next/navigation";

// The flow always starts at upload. A scanned QR carries ?machine=VM001,
// which we preserve on the redirect.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ machine?: string }>;
}) {
  const { machine } = await searchParams;
  redirect(machine ? `/upload?machine=${encodeURIComponent(machine)}` : "/upload");
}
