import { z } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors; code?: string };

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

/** `code` is the database error key, for clients that react to a specific refusal. */
export function fail(error: string, fieldErrors?: FieldErrors, code?: string): ActionResult<never> {
  return {
    ok: false,
    error,
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(code ? { code } : {}),
  };
}

export function invalidInput(error: z.ZodError) {
  return fail("Check the highlighted fields.", z.flattenError(error).fieldErrors);
}
