import Link from "next/link";
import { AccountNav } from "@/features/auth/components/account-nav";
import { getMessages } from "@/i18n";
import { Container } from "./container";
import { MainNav } from "./main-nav";

/** Na telefonach nawigacja jest osobnym rzędem — bez przewijania w poziomie. */
export function SiteHeader() {
  const t = getMessages();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur-md">
      <Container className="flex flex-col sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex h-11 items-center justify-between gap-3 sm:h-auto">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-semibold tracking-tight whitespace-nowrap text-primary"
          >
            <span aria-hidden className="grid size-7 place-items-center rounded-md bg-primary text-xs text-primary-foreground">
              TK
            </span>
            {t.app.name}
          </Link>
          <div className="sm:hidden">
            <AccountNav />
          </div>
        </div>
        <MainNav />
        <div className="hidden sm:block">
          <AccountNav />
        </div>
      </Container>
    </header>
  );
}
