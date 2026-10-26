import { redirect } from "next/navigation";

/** Panel zastępuje strona główna po kreatorze. */
export default function Page() {
  redirect("/");
}
