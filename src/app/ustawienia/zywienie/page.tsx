import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { DietSettingsForm } from "@/features/preferences/components/diet-settings-form";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.nutritionSettings.title };

export default function NutritionSettingsPage() {
  return (
    <Container>
      <PageHeader title={t.screens.nutritionSettings.title} description={t.screens.nutritionSettings.description} />
      <DietSettingsForm />
    </Container>
  );
}
