import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.onboarding.title };

export default function OnboardingPage() {
  return (
    <Container>
      <PageHeader title={t.screens.onboarding.title} description={t.screens.onboarding.description} />
      <ProfileForm />
    </Container>
  );
}
