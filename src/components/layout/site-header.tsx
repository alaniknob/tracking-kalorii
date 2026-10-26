import Link from "next/link";
import { MAIN_NAV, SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";
import { Container } from "./container";

export function SiteHeader() {
  const t = getMessages();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-primary">
          <span aria-hidden className="grid size-7 place-items-center rounded-md bg-primary text-xs text-primary-foreground">
            TK
          </span>
          {t.app.name}
        </Link>
        <nav aria-label={t.common.mainNav} className="-mr-2 overflow-x-auto">
          <ul className="flex items-center gap-1 text-sm">
            {MAIN_NAV.map((id) => {
              const screen = SCREENS[id];
              return (
                <li key={id}>
                  <Link
                    href={screen.path}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 whitespace-nowrap text-foreground hover:bg-primary-soft"
                  >
                    {t.screens[id].title}
                    {screen.available ? null : (
                      <span className="text-[10px] font-medium tracking-wide text-subtle uppercase">
                        {t.common.soon}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Container>
    </header>
  );
}
