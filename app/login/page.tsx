"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            Command Hub
          </h1>
          <p className="mt-1 text-sm text-fg-2">
            Enter your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-xl border px-4 py-3 outline-none transition-colors border-line-2 bg-panel text-fg placeholder-fg-3 focus:border-line-2"
          />

          {error && (
            <p className="text-sm text-bad text-center">Incorrect password</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-fg text-bg hover:brightness-125"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
