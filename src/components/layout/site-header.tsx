import Link from "next/link";
import { AccountNav } from "@/features/auth/components/account-nav";
import { MAIN_NAV, SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";
import { Container } from "./container";

/** Na telefonach nawigacja jest osobnym rzędem w siatce 5 kolumn — bez przewijania w poziomie. */
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
        <nav aria-label={t.common.mainNav} className="-mx-2 pb-1.5 sm:mx-0 sm:pb-0" data-testid="main-nav">
          <ul className="grid grid-cols-5 text-xs sm:flex sm:items-center sm:gap-0.5 sm:text-sm">
            {MAIN_NAV.map((id) => {
              const screen = SCREENS[id];
              return (
                <li key={id} className="min-w-0">
                  <Link
                    href={screen.path}
                    className="flex flex-col items-center rounded-lg px-0.5 py-1 text-center text-foreground hover:bg-primary-soft sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3 sm:py-1.5"
                  >
                    <span className="max-w-full truncate">{t.nav[id]}</span>
                    {screen.available ? null : (
                      <span className="text-[9px] leading-tight font-medium tracking-wide text-subtle uppercase sm:text-[10px]">
                        {t.common.soon}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="hidden sm:block">
          <AccountNav />
        </div>
      </Container>
    </header>
  );
}
