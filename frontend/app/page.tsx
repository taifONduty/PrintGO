import { redirect } from "next/navigation";
import { Landing } from "@/components/Landing";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ machine?: string }>;
}) {
  const { machine } = await searchParams;
  if (machine) redirect(`/upload?machine=${encodeURIComponent(machine)}`);
  return <Landing />;
}
