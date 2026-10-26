import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("budget");

export default function Page() {
  return <UnavailableScreen id="budget" />;
}
