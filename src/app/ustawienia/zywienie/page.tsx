import { UnavailableScreen, unavailableMetadata } from "@/components/layout/unavailable-screen";

export const metadata = unavailableMetadata("nutritionSettings");

export default function Page() {
  return <UnavailableScreen id="nutritionSettings" />;
}
