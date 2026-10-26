import { redirect } from "next/navigation";
import { getAuthState } from "@/features/auth/session";
import { loadAccountDraftsAction } from "@/features/auth/persist";
import { resumePathForStep, type WizardDrafts } from "./progress";
import type { WizardStepId } from "./steps";

export async function loadWizardDrafts(): Promise<WizardDrafts> {
  const loaded = await loadAccountDraftsAction();
  if (loaded.status !== "ready") {
    return { profile: "", diet: "", restrictions: "", stores: "", budget: "" };
  }
  return {
    profile: loaded.drafts.profile,
    diet: loaded.drafts.diet,
    restrictions: loaded.drafts.restrictions,
    stores: loaded.drafts.stores,
    budget: loaded.drafts.budget,
  };
}

export async function requireSignedIn(): Promise<{ userId: string; email: string | null }> {
  const auth = await getAuthState();
  if (auth.status !== "authenticated") redirect("/");
  return { userId: auth.userId, email: auth.email };
}

/** Gość → rejestracja. Kompletny profil → strona główna. Za daleki krok → pierwszy brakujący. */
export async function enforceWizardStep(step: WizardStepId): Promise<WizardDrafts> {
  await requireSignedIn();
  const drafts = await loadWizardDrafts();
  const bounce = resumePathForStep(step, drafts);
  if (bounce) redirect(bounce);
  return drafts;
}

