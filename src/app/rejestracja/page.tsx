import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("register");

export default function Page() {
  return <UnavailableScreen id="register" />;
}
