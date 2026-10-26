"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type NavState = { status: "loading" } | { status: "guest" } | { status: "user"; email: string | null };

export function AccountNav() {
  const t = getMessages().auth.nav;
  const [state, setState] = useState<NavState>({ status: "loading" });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({ status: "guest" });
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setState({ status: "guest" });
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      setState(data.user ? { status: "user", email: data.user.email ?? null } : { status: "guest" });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session?.user ? { status: "user", email: session.user.email ?? null } : { status: "guest" });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (state.status === "loading") return null;
  if (state.status === "user") {
    return (
      <Link
        href={SCREENS.profileSettings.path}
        className="max-w-[9rem] truncate text-xs font-medium text-primary hover:underline sm:max-w-[14rem] sm:text-sm"
        data-testid="account-nav-user"
      >
        {state.email ?? t.account}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm" data-testid="account-nav-guest">
      <Link href={SCREENS.login.path} className="font-medium text-primary hover:underline">
        {t.login}
      </Link>
      <span className="text-subtle" aria-hidden>
        ·
      </span>
      <Link href={SCREENS.register.path} className="font-medium text-primary hover:underline">
        {t.register}
      </Link>
    </div>
  );
}
