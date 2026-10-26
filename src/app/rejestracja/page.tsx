import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { AuthForm } from "@/features/auth/components/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.register.title };

export default function Page() {
  return (
    <Container>
      <PageHeader title={t.screens.register.title} description={t.screens.register.description} />
      <AuthForm mode="register" configured={isSupabaseConfigured()} />
    </Container>
  );
}
