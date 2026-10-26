import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("shopping");

export default function Page() {
  return <UnavailableScreen id="shopping" />;
}
