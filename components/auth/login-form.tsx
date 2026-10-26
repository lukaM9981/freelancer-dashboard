"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { signIn } from "@/lib/auth/actions";
import {
  clearRememberedLogin,
  readRememberedLogin,
  rememberedPasswordFor,
  writeRememberedLogin,
} from "@/lib/auth/remembered-login";
import { type LoginInput, loginSchema } from "@/lib/auth/schemas";
import { applyFieldErrors } from "@/lib/forms";

export function LoginForm({ next }: { next?: string }) {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const [ready, setReady] = useState(false);
  const appliedPassword = useRef<string | null>(null);
  const email = form.watch("email");

  useLayoutEffect(() => {
    const saved = readRememberedLogin();
    if (saved) {
      form.reset({ email: saved.email, password: saved.password, remember: true });
      appliedPassword.current = saved.password;
    }
    setReady(true);
  }, [form]);

  useEffect(() => {
    if (!ready) return;
    const nextPassword = rememberedPasswordFor(readRememberedLogin(), email);
    const current = form.getValues("password");
    if (nextPassword != null) {
      if (current !== nextPassword) form.setValue("password", nextPassword);
      appliedPassword.current = nextPassword;
      return;
    }
    if (appliedPassword.current != null && current === appliedPassword.current) {
      form.setValue("password", "");
      appliedPassword.current = null;
    }
  }, [email, form, ready]);

  async function onSubmit(values: LoginInput) {
    const previous = readRememberedLogin();
    if (values.remember) writeRememberedLogin(values.email, values.password);
    else clearRememberedLogin();

    const result = await signIn(values, next);
    if (result && !result.ok) {
      if (previous) writeRememberedLogin(previous.email, previous.password);
      else clearRememberedLogin();
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
      <FieldGroup>
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
        />
        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          reveal
          autoComplete="current-password"
          description={
            <Link href="/forgot-password" className="rounded-sm focus-ring">
              Forgot your password?
            </Link>
          }
        />
        <Controller
          control={form.control}
          name="remember"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Checkbox
                id="field-remember"
                name={field.name}
                checked={field.value}
                onBlur={field.onBlur}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <FieldLabel htmlFor="field-remember">Remember me</FieldLabel>
            </div>
          )}
        />
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting} className="w-full">
        Sign In
      </SubmitButton>
    </form>
  );
}
