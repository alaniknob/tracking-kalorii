import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("week");

export default function Page() {
  return <UnavailableScreen id="week" />;
}
