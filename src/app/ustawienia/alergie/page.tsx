import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("allergies");

export default function Page() {
  return <UnavailableScreen id="allergies" />;
}
