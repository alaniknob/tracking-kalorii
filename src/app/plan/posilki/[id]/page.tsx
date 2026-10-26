import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("meal");

export default function Page() {
  return <UnavailableScreen id="meal" />;
}
