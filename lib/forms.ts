import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { FieldErrors } from "@/lib/db/result";

// Shows the field errors from an action result next to their fields.
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: FieldErrors | undefined,
) {
  for (const [name, messages] of Object.entries(fieldErrors ?? {})) {
    if (messages?.[0]) setError(name as Path<T>, { type: "server", message: messages[0] });
  }
}
