"use client";

import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n";
import "./globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = getMessages();
  return (
    <html lang="pl">
      <body className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div data-testid="unexpected-error">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">{t.errors.unexpectedTitle}</h1>
          <p className="mt-3 max-w-md text-muted">{t.errors.unexpectedBody}</p>
          <Button onClick={reset} className="mt-6">
            {t.errors.retry}
          </Button>
        </div>
      </body>
    </html>
  );
}
