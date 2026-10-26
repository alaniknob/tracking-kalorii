import { redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AuthForm } from "@/features/auth/components/auth-form";
import { getAuthState } from "@/features/auth/session";
import { firstIncompleteWizardPath } from "@/features/onboarding/progress";
import { loadWizardDrafts } from "@/features/onboarding/gate";
import { SCREENS } from "@/config/routes";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getMessages } from "@/i18n";

export default async function HomePage() {
  const t = getMessages();
  const auth = await getAuthState();

  if (auth.status === "authenticated") {
    const resume = firstIncompleteWizardPath(await loadWizardDrafts());
    if (resume) redirect(resume);
    return <ProductHome email={auth.email} />;
  }

  return (
    <Container>
      <section className="pt-16 pb-10 text-center sm:pt-24" data-testid="register-home">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-primary sm:text-6xl">
          {t.app.tagline}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">{t.app.description}</p>
      </section>
      <div className="mx-auto max-w-md pb-14 text-left">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">{t.screens.register.title}</h2>
        <AuthForm mode="register" configured={isSupabaseConfigured()} compactConfig />
      </div>
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
    </Container>
  );
}

function ProductHome({ email }: { email: string | null }) {
  const t = getMessages();
  const d = t.auth.dashboard;
  const cards = [
    { screen: SCREENS.generator, hint: d.planHint },
    { screen: SCREENS.week, hint: t.screens.week.description },
    { screen: SCREENS.shopping, hint: d.shoppingHint },
  ] as const;

  return (
    <Container>
      <section className="pt-16 pb-10 sm:pt-24" data-testid="product-home">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-primary sm:text-6xl">{t.app.tagline}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{t.app.description}</p>
        {email ? <p className="mt-4 text-sm text-muted">{d.signedIn(email)}</p> : null}
        <div className="mt-8">
          <ButtonLink href={SCREENS.generator.path} size="lg">
            {t.screens.generator.title}
          </ButtonLink>
        </div>
      </section>
      <div className="grid gap-4 pb-14 sm:grid-cols-3">
        {cards.map(({ screen, hint }) => (
          <Card key={screen.id}>
            <CardTitle>{t.screens[screen.id].title}</CardTitle>
            <CardDescription>{hint}</CardDescription>
            <ButtonLink href={screen.path} className="mt-3" variant="secondary">
              {t.screens[screen.id].title}
            </ButtonLink>
          </Card>
        ))}
      </div>
    </Container>
  );
}
