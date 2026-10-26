import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { listedScreens, SCREENS, type ScreenGroup } from "@/config/routes";
import { getMessages } from "@/i18n";

const GROUP_ORDER: ScreenGroup[] = ["start", "settings", "catalog", "planning", "account"];

export default function HomePage() {
  const t = getMessages();
  const screens = listedScreens();

  return (
    <Container>
      <section className="pt-16 pb-14 text-center sm:pt-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-primary sm:text-6xl">
          {t.app.tagline}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">{t.app.description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href={SCREENS.onboarding.path} size="lg">
            {t.home.ctaPrimary}
          </ButtonLink>
          <ButtonLink href="#ekrany" variant="secondary" size="lg">
            {t.home.ctaScreens}
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="co-dziala" className="pb-14">
        <h2 id="co-dziala" className="mb-5 text-xl font-semibold tracking-tight">
          {t.home.featuresTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {t.home.features.map((feature) => (
            <Card key={feature.title}>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.body}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <section id="ekrany" aria-labelledby="ekrany-tytul" className="scroll-mt-20">
        <h2 id="ekrany-tytul" className="text-xl font-semibold tracking-tight">
          {t.home.screensTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{t.home.screensLead}</p>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {GROUP_ORDER.map((group) => (
            <div key={group}>
              <h3 className="mb-2 text-xs font-semibold tracking-wider text-subtle uppercase">{t.home.groups[group]}</h3>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {screens
                  .filter((screen) => screen.group === group)
                  .map((screen) => (
                    <li key={screen.id}>
                      <Link
                        href={screen.path}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-muted"
                      >
                        <span className="font-medium text-foreground">{t.screens[screen.id].title}</span>
                        {screen.available ? (
                          <Badge tone="success">{t.common.available}</Badge>
                        ) : (
                          <Badge>
                            {t.common.unavailable} · {t.common.stage(screen.stage)}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
