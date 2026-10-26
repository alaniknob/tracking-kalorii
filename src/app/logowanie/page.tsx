import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("login");

export default function Page() {
  return <UnavailableScreen id="login" />;
}
