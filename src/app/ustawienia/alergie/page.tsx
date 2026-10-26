import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { RestrictionsForm } from "@/features/preferences/components/restrictions-form";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.allergies.title };

export default function AllergiesPage() {
  return (
    <Container>
      <PageHeader title={t.screens.allergies.title} description={t.screens.allergies.description} />
      <RestrictionsForm />
    </Container>
  );
}
