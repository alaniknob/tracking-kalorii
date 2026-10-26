import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { StoresForm } from "@/features/stores/components/stores-form";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.stores.title };

export default function StoresPage() {
  return (
    <Container>
      <PageHeader title={t.screens.stores.title} description={t.screens.stores.description} />
      <StoresForm />
    </Container>
  );
}
