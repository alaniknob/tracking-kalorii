"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n";
import { logoutAction } from "../actions";

export function LogoutButton() {
  const t = getMessages().auth;
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      data-testid="logout"
      onClick={() => {
        void logoutAction().then(() => router.push("/"));
      }}
    >
      {t.logout}
    </Button>
  );
}
