'use client';

export function SignOutButton() {
  return (
    <form action="/api/auth/sign-out" method="POST">
      <button
        type="submit"
        className="kp-eyebrow text-[var(--stone-500)] hover:text-[var(--ink)] transition-colors duration-200 cursor-pointer"
      >
        — Déconnexion
      </button>
    </form>
  );
}
