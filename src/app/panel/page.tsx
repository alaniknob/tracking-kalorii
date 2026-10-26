import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("dashboard");

export default function Page() {
  return <UnavailableScreen id="dashboard" />;
}
