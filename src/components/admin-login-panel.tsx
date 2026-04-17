"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SubmissionState = {
  kind: "error";
  message: string;
} | null;

export function AdminLoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submissionState, setSubmissionState] = useState<SubmissionState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setSubmissionState(null);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Admin girişi mümkün olmadı.");
      }

      router.push(searchParams.get("next") || "/admin");
      router.refresh();
    } catch (error) {
      setSubmissionState({
        kind: "error",
        message: error instanceof Error ? error.message : "Admin girişi mümkün olmadı."
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="admin-login-card">
      <div className="admin-login-card__header">
        <h1>Admin giriş</h1>
        <p>İdarəetmə panelinə daxil olmaq üçün istifadəçi adı və parolu daxil et.</p>
      </div>

      <form className="admin-login-form" onSubmit={(event) => void signIn(event)}>
        <label className="admin-field">
          <span>İstifadəçi adı</span>
          <input
            type="text"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
            autoComplete="username"
            required
          />
        </label>

        <label className="admin-field">
          <span>Parol</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Parolu daxil et"
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="admin-button admin-button--primary" disabled={isLoading}>
          {isLoading ? "Daxil olunur..." : "Daxil ol"}
        </button>
      </form>

      {submissionState ? <p className="admin-form-message admin-form-message--error">{submissionState.message}</p> : null}
    </section>
  );
}
