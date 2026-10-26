import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("history");

export default function Page() {
  return <UnavailableScreen id="history" />;
}
