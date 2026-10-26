"use client";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = getMessages();
  return (
    <Container>
      <PageHeader title={t.errors.unexpectedTitle} description={t.errors.unexpectedBody} />
      <Button onClick={reset}>{t.errors.retry}</Button>
    </Container>
  );
}
