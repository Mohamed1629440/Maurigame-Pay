"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/#operateurs", label: "Opérateurs" },
  { href: "/#fonctionnement", label: "Comment ça marche" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/#api", label: "API" },
  { href: "/#tarifs", label: "Tarifs" },
];

export function KpHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "/";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-[var(--paper)]/92 backdrop-blur border-b border-[var(--stone-200)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-4 sm:gap-6">
        <a href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <span className="inline-flex w-7 h-7 items-center justify-center bg-[var(--ink)] text-white font-mono text-[12px] font-semibold rounded-sm">
            M
          </span>
          <span className="serif text-[14px] sm:text-[15px] tracking-[0.18em] uppercase font-medium">
            Maurigame Pay
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-7 flex-1 justify-center text-[11px] tracking-[0.22em] uppercase font-medium text-[var(--stone-700)]">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-[var(--ink)] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex gap-2.5 flex-shrink-0">
          <a
            href="/admin"
            className="kp-btn kp-btn-ghost"
            style={{ padding: "0.55rem 1.1rem", fontSize: "0.7rem" }}
          >
            الإدارة
          </a>
          <a
            href="/sandbox"
            className="kp-btn kp-btn-primary"
            style={{ padding: "0.55rem 1.1rem", fontSize: "0.7rem" }}
          >
            اختبار مباشر
          </a>
        </div>

        {/* Mobile burger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="md:hidden w-11 h-11 rounded-sm border border-[var(--stone-300)] flex items-center justify-center hover:bg-[var(--stone-100)] active:scale-95 transition"
        >
          {open ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 top-14 bg-[var(--ink)]/40 backdrop-blur-sm z-40"
          />
          <div className="md:hidden fixed top-14 left-0 right-0 bg-[var(--paper)] shadow-lg z-50 border-b border-[var(--stone-200)] max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <nav className="flex flex-col py-2">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="px-6 py-3.5 text-base font-medium border-b border-[var(--stone-200)] hover:bg-[var(--stone-100)] active:bg-[var(--bronze-light)]/20 transition-colors text-[var(--stone-700)] hover:text-[var(--ink)]"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="/admin"
                onClick={() => setOpen(false)}
                className="px-6 py-3.5 text-base font-medium border-b border-[var(--stone-200)] text-[var(--stone-700)] hover:bg-[var(--stone-100)] active:bg-[var(--bronze-light)]/20 transition-colors"
              >
                Admin
              </a>
              <a
                href="/sandbox"
                onClick={() => setOpen(false)}
                className="px-6 py-3.5 text-base font-bold bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90 active:bg-[var(--bronze)] transition-colors"
              >
                Tester en live →
              </a>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
