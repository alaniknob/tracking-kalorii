"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { getServiceRoleKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { fieldErrorsOf } from "@/lib/draft";
import { getMessages } from "@/i18n";
import { createLoginSchema, createRegisterSchema, readAuthFormData, type AuthField, type AuthFormValues } from "./schema";
import { getAuthState } from "./session";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export type AuthFormState =
  | { status: "idle"; values: AuthFormValues }
  | { status: "invalid"; values: AuthFormValues; message: string; fieldErrors: Partial<Record<AuthField, string>> }
  | { status: "not_configured" }
  | { status: "error"; values: AuthFormValues; message: string }
  | { status: "confirm_email"; email: string }
  | { status: "signed_in" }
  | { status: "signed_out" }
  | { status: "deleted" };

const empty = (): AuthFormValues => ({ email: "", password: "", consent: "" });

function mapAuthError(message: string): string {
  const a = getMessages().auth.errors;
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) return a.alreadyRegistered;
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) return a.invalidCredentials;
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) return a.emailNotConfirmed;
  if (lower.includes("rate limit") || lower.includes("too many")) return a.rateLimited;
  if (lower.includes("password")) return a.weakPassword;
  return a.generic;
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { status: "not_configured" };
  const values = readAuthFormData(formData);
  const parsed = createRegisterSchema().safeParse(values);
  if (!parsed.success) {
    return {
      status: "invalid",
      values: { ...values, password: "" },
      message: getMessages().validation.formInvalid,
      fieldErrors: fieldErrorsOf<AuthField>(parsed.error),
    };
  }
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "not_configured" };
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { status: "error", values: { ...values, password: "" }, message: mapAuthError(error.message) };
  if (!data.session) return { status: "confirm_email", email: parsed.data.email };
  revalidatePath("/", "layout");
  return { status: "signed_in" };
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { status: "not_configured" };
  const values = readAuthFormData(formData);
  const parsed = createLoginSchema().safeParse(values);
  if (!parsed.success) {
    return {
      status: "invalid",
      values: { ...values, password: "" },
      message: getMessages().validation.formInvalid,
      fieldErrors: fieldErrorsOf<AuthField>(parsed.error),
    };
  }
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "not_configured" };
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { status: "error", values: { ...values, password: "" }, message: mapAuthError(error.message) };
  revalidatePath("/", "layout");
  return { status: "signed_in" };
}

export async function logoutAction(): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { status: "not_configured" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "not_configured" };
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { status: "signed_out" };
}

export async function deleteAccountAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { status: "not_configured" };
  const confirm = formData.get("confirm");
  if (confirm !== "on") {
    return {
      status: "invalid",
      values: empty(),
      message: getMessages().auth.delete.confirmRequired,
      fieldErrors: { consent: getMessages().auth.delete.confirmRequired },
    };
  }
  const auth = await getAuthState();
  if (auth.status !== "authenticated") {
    return { status: "error", values: empty(), message: getMessages().auth.errors.notSignedIn };
  }
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "not_configured" };

  const { error: rpcError } = await supabase.rpc("delete_own_account");
  if (rpcError) {
    const serviceKey = getServiceRoleKey();
    const config = getSupabasePublicConfig();
    if (!serviceKey || !config) {
      return { status: "error", values: empty(), message: getMessages().auth.delete.needsServiceRole };
    }
    const admin = createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: adminError } = await admin.auth.admin.deleteUser(auth.userId);
    if (adminError) return { status: "error", values: empty(), message: getMessages().auth.delete.failed };
  }
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { status: "deleted" };
}
