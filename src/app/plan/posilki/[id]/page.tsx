import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { MealDetail } from "@/features/meal-planning/components/meal-detail";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.meal.title };

export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Container>
      <PageHeader title={t.screens.meal.title} description={t.screens.meal.description} />
      <MealDetail id={id} />
    </Container>
  );
}
