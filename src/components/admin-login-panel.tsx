"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SubmissionState = {
  kind: "error";
  message: string;
} | null;

export function AdminLoginPanel() {
  const router = useRouter();
  const [submissionState, setSubmissionState] = useState<SubmissionState>(null);
  const [isLoading, setIsLoading] = useState(false);
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
        body: JSON.stringify({ password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Admin girişi mümkün olmadı.");
      }

      router.push("/admin");
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
    <section className="detail-panel stack-sm">
      <p className="eyebrow">Admin giriş</p>
      <h2>Ayrı admin keçidi</h2>
      <p>
        İctimai login və signup söndürülüb. Admin hissəsinə yalnız bu ayrıca giriş keçidindən və
        env ilə konfiqurasiya olunan admin parolu ilə daxil olmaq mümkündür.
      </p>

      <form className="stack-sm" onSubmit={(event) => void signIn(event)}>
        <label className="field">
          <span>Admin parolu</span>
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

        <button type="submit" className="button button--primary button--full" disabled={isLoading}>
          {isLoading ? "Daxil olunur..." : "Admin kimi daxil ol"}
        </button>
      </form>

      {submissionState ? <p>{submissionState.message}</p> : null}
    </section>
  );
}
