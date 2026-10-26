import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("profileSettings");

export default function Page() {
  return <UnavailableScreen id="profileSettings" />;
}
