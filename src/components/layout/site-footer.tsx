import { getMessages } from "@/i18n";
import { Container } from "./container";

export function SiteFooter() {
  const t = getMessages();
  return (
    <footer className="mt-20 border-t border-border py-8 text-xs text-muted">
      <Container>{t.footer.note}</Container>
    </footer>
  );
}
