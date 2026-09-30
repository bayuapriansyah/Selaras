"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, AnimatePresence } from "motion/react";
import { Menu, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo, LogoMark } from "@/components/layout/Logo";
import { navHrefs, navItems } from "@/data/nav";
import { useActiveSection } from "@/hooks/use-active-section";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 280, damping: 32, mass: 0.8 } as const;

export function Navbar() {
  const { scrollY } = useScroll();
  // Always start false (matches SSR), correct after hydration in useEffect
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const active = useActiveSection(navHrefs);

  // After hydration, sync with real scroll position
  useEffect(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > 20;
    setScrolled((prev) => (prev === next ? prev : next));
  });

  const close = useCallback(() => setOpen(false), []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <motion.div
        initial={false}
        animate={
          scrolled
            ? {
                // Floating pill state
                width: "calc(100% - 2rem)",
                maxWidth: "72rem",
                marginTop: "12px",
                paddingLeft: "20px",
                paddingRight: "20px",
                paddingTop: "8px",
                paddingBottom: "8px",
                borderRadius: "9999px",
                backgroundColor: "rgba(255,255,255,0.97)",
                boxShadow:
                  "0 12px 40px -8px rgba(0,0,0,0.10), 0 0 0 1px rgba(226,232,240,0.95)",
              }
            : {
                // Full-width flat bar state
                width: "100%",
                maxWidth: "100%",
                marginTop: "0px",
                paddingLeft: "40px",
                paddingRight: "40px",
                paddingTop: "14px",
                paddingBottom: "14px",
                borderRadius: "0px",
                backgroundColor: "rgba(255,255,255,0.85)",
                boxShadow:
                  "0 0px 0px 0px transparent, 0 1px 0 0 rgba(226,232,240,0.8)",
              }
        }
        transition={SPRING}
        className="pointer-events-auto flex items-center justify-between relative backdrop-blur-xl"
        style={{ willChange: "width, padding, border-radius, box-shadow" }}
      >
        {/* Top luminous hairline edge (visible when scrolled floating pill) */}
        <motion.div
          aria-hidden="true"
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-x-12 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent rounded-full"
        />

        {/* Brand Logo & Live Status */}
        <div className="flex items-center gap-3">
          <a
            href="#top"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-opacity hover:opacity-90"
            aria-label="SELARAS, kembali ke atas"
          >
            <Logo />
          </a>

        </div>

        {/* Desktop Navigation with Animated Sliding Pill */}
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-1 md:flex relative p-1"
          onMouseLeave={() => setHoveredHref(null)}
        >
          {navItems.map((item) => {
            const isActive = active === item.href;
            const isHovered = hoveredHref === item.href;

            return (
              <a
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHoveredHref(item.href)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative z-10 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                  isActive
                    ? "text-sky-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {/* Hover Background Pill */}
                {isHovered && (
                  <motion.span
                    layoutId="nav-pill-hover"
                    className="absolute inset-0 -z-10 rounded-full bg-slate-100/90 shadow-2xs"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {isActive && !isHovered && (
                  <motion.span
                    layoutId="nav-pill-active"
                    className="absolute inset-0 -z-10 rounded-full bg-sky-50 border border-sky-200/70 shadow-2xs"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <span className="flex items-center gap-1.5">
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-sky-600"
                    />
                  )}
                  {item.label}
                </span>
              </a>
            );
          })}
        </nav>

        {/* Action Controls & Mobile Menu */}
        <div className="flex items-center gap-2.5">
          <Button
            asChild
            className={cn(
              "hidden sm:inline-flex h-9 rounded-full px-4 text-xs font-semibold text-white transition-all duration-300",
              "bg-slate-900 hover:bg-slate-800 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
              "border border-slate-800",
            )}
          >
            <Link href="/app" className="flex items-center gap-1.5">
              <span>Buka Aplikasi</span>
              <ArrowRight className="size-3 text-slate-400" aria-hidden="true" />
            </Link>
          </Button>

          {/* Mobile Sheet Trigger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-9 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs md:hidden"
                aria-label="Buka menu navigasi"
              >
                <Menu className="size-4" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85%] border-l border-slate-200 bg-white/95 backdrop-blur-2xl p-0 text-slate-900 sm:max-w-sm flex flex-col"
            >
              <SheetHeader className="border-b border-slate-100 px-6 py-5">
                <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <LogoMark className="size-8" />
                    <div>
                      <span className="font-bold tracking-widest text-slate-900 text-base block">SELARAS</span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <nav
                aria-label="Navigasi seluler"
                className="flex flex-col gap-1 p-5 overflow-y-auto"
              >
                {navItems.map((item) => {
                  const isActive = active === item.href;
                  return (
                    <SheetClose asChild key={item.href}>
                      <a
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 outline-none",
                          isActive
                            ? "bg-sky-50 text-sky-900 border border-sky-200 font-semibold shadow-2xs"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                        )}
                      >
                        <span>{item.label}</span>
                        {isActive ? (
                          <span className="size-2 rounded-full bg-emerald-500 shadow-xs" />
                        ) : (
                          <ArrowRight className="size-3.5 text-slate-300" />
                        )}
                      </a>
                    </SheetClose>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-slate-100 p-5 bg-slate-50/50 space-y-3">
                <Button
                  asChild
                  onClick={close}
                  className="h-11 w-full rounded-full bg-slate-900 hover:bg-slate-800 font-semibold text-white shadow-md flex items-center justify-center gap-2"
                >
                  <Link href="/app">
                    Buka Aplikasi Demo
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>
    </header>
  );
}
