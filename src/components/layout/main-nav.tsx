"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isWizardPath, MAIN_NAV, SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Plan / generator / zakupy — tylko po zalogowaniu, poza kreatorem. */
export function MainNav() {
  const t = getMessages();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || isWizardPath(pathname)) {
      setVisible(false);
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setVisible(false);
      return;
    }
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setVisible(Boolean(data.user));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setVisible(Boolean(session?.user) && !isWizardPath(pathname));
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  return (
    <nav aria-label={t.common.mainNav} className="-mx-2 pb-1.5 sm:mx-0 sm:pb-0" data-testid="main-nav">
      {visible ? (
        <ul className="grid grid-cols-3 text-xs sm:flex sm:items-center sm:gap-0.5 sm:text-sm">
          {MAIN_NAV.map((id) => {
            const screen = SCREENS[id];
            return (
              <li key={id} className="min-w-0">
                <Link
                  href={screen.path}
                  className="flex flex-col items-center rounded-lg px-0.5 py-1 text-center text-foreground hover:bg-primary-soft sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3 sm:py-1.5"
                >
                  <span className="max-w-full truncate">{t.nav[id] ?? t.screens[id].title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </nav>
  );
}
