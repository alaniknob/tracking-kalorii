import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { getMessages } from "@/i18n";

export function ConfigMissing({ compact = false }: { compact?: boolean }) {
  const t = getMessages().auth.config;
  return (
    <Alert tone="warning" title={t.title} data-testid="brak-konfiguracji">
      <p>{t.body}</p>
      {!compact ? (
        <div className="mt-2 space-y-3">
          <p>{t.hint}</p>
          <ButtonLink href="/" variant="secondary">
            {getMessages().common.backHome}
          </ButtonLink>
        </div>
      ) : null}
    </Alert>
  );
}
