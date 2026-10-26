import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getMessages } from "@/i18n";

export default function NotFound() {
  const t = getMessages();
  return (
    <Container>
      <div data-testid="not-found">
        <PageHeader title={t.errors.notFoundTitle} description={t.errors.notFoundBody} />
        <ButtonLink href="/" variant="secondary">
          {t.common.backHome}
        </ButtonLink>
      </div>
    </Container>
  );
}
