"use server";

import { getMessages } from "@/i18n";
import { fieldErrorsOf } from "@/lib/draft";
import { readStoresFormData, selectedStores, storesSettingsSchema, type StoresField, type StoresFormValues } from "./schema";
import type { Store } from "./stores";

export type StoresFormState =
  | { status: "idle"; values: StoresFormValues }
  | { status: "invalid"; values: StoresFormValues; message: string; fieldErrors: Partial<Record<StoresField, string>> }
  | { status: "success"; values: StoresFormValues; selected: Store[] };

export async function saveStoresAction(_prev: StoresFormState, formData: FormData): Promise<StoresFormState> {
  const values = readStoresFormData(formData);
  const parsed = storesSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "invalid",
      values,
      message: getMessages().validation.formInvalid,
      fieldErrors: fieldErrorsOf<StoresField>(parsed.error),
    };
  }
  return { status: "success", values, selected: selectedStores(parsed.data) };
}
