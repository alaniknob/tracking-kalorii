import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("generator");

export default function Page() {
  return <UnavailableScreen id="generator" />;
}
