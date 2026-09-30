"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  Layers3,
  Menu,
  ScrollText,
  Settings,
  Stethoscope,
} from "lucide-react";
import { cn } from "cn";
import { AppStoreProvider, useApp } from "@/components/app/store";
import { SearchBox } from "@/components/app/SearchBox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL } from "@/lib/app/actions";
import type { Role } from "@/data/app/types";
import { formatDateTime } from "@/lib/app/format";

const NAV: { group: string; items: { label: string; href: string; icon: typeof BarChart3 }[] }[] = [
  {
    group: "Operasional",
    items: [
      { label: "Ringkasan", href: "/app", icon: LayoutDashboard },
      { label: "Pelayanan", href: "/app/pelayanan", icon: Stethoscope },
      { label: "Service Passport", href: "/app/passport", icon: FileCheck2 },
      { label: "Klaim", href: "/app/claims", icon: ClipboardList },
    ],
  },
  {
    group: "Analisis",
    items: [
      { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
      { label: "Template Layanan", href: "/app/service-templates", icon: Layers3 },
      { label: "Log Audit", href: "/app/audit-log", icon: ScrollText },
    ],
  },
  {
    group: "Sistem",
    items: [{ label: "Pengaturan", href: "/app/settings", icon: Settings }],
  },
];

const ROLES: Role[] = ["reviewer", "operator", "provider", "admin"];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <Image
        src="/logo.png"
        alt=""
        width={32}
        height={24}
        aria-hidden="true"
        className="size-8 shrink-0 object-contain"
      />
      <span>
        <span className="block text-sm font-semibold tracking-tight text-slate-900">
          SELARAS
        </span>
        <span className="block text-[11px] text-slate-500">
          Evidence Intelligence
        </span>
      </span>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi aplikasi" className="flex flex-1 flex-col gap-5 px-3 py-2">
      {NAV.map((group) => (
        <div key={group.group}>
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            {group.group}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
                      active
                        ? "bg-sky-50 font-medium text-sky-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn("size-4", active ? "text-sky-600" : "text-slate-400")}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard() {
  const { user, role } = useApp();
  return (
    <Link
      href="/app/settings"
      className="flex items-center gap-2.5 rounded-xl border-t border-slate-200 p-3 transition-colors hover:bg-slate-50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
        {user.initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-800">
          {user.name}
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          {ROLE_LABEL[role]}
        </span>
      </span>
    </Link>
  );
}

function NotificationsMenu() {
  const { src, state, markAllRead, unread } = useApp();
  const notes = [...src.notifications]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          suppressHydrationWarning
          aria-label={`Notifikasi, ${unread} belum dibaca`}
          className="relative flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <Bell aria-hidden="true" className="size-4" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-sky-600 text-[9px] font-semibold text-white">
              {unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
        <div className="flex flex-col gap-0.5">
          {notes.map((n) => {
            const isRead = state.readIds.includes(n.id);
            return (
              <div
                key={n.id}
                className={cn(
                  "rounded-lg px-2.5 py-2",
                  isRead ? "opacity-60" : "bg-sky-50/60",
                )}
              >
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {n.body}
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-wider text-slate-400">
                  {formatDateTime(n.at)}
                </p>
              </div>
            );
          })}
          {notes.length === 0 ? (
            <p className="px-2.5 py-3 text-sm text-slate-500">
              Belum ada notifikasi.
            </p>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={markAllRead}>
          Tandai semua dibaca
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const { user, role, setRole } = useApp();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          suppressHydrationWarning
          aria-label="Menu profil"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-3 pl-1 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-sky-600 text-[11px] font-semibold text-white">
            {user.initials}
          </span>
          <span className="hidden text-xs font-medium text-slate-700 sm:block">
            {ROLE_LABEL[role]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium text-slate-800">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Ganti role (demo)</DropdownMenuLabel>
        {ROLES.map((r) => (
          <DropdownMenuItem key={r} onSelect={() => setRole(r)}>
            {ROLE_LABEL[r]}
            {r === role ? (
              <span className="ml-auto font-mono text-[10px] tracking-wider text-sky-600">
                AKTIF
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings">Pengaturan</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Buka menu navigasi"
          className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-400 lg:hidden"
        >
          <Menu aria-hidden="true" className="size-4.5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-0 border-r border-slate-200 bg-white p-0 sm:max-w-none">
        <SheetHeader className="border-b border-slate-100 p-0">
          <SheetTitle className="sr-only">Menu aplikasi</SheetTitle>
          <Brand />
        </SheetHeader>
        <NavList onNavigate={() => setOpen(false)} />
        <UserCard />
      </SheetContent>
    </Sheet>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Brand />
        <NavList />
        <UserCard />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md lg:px-8">
          <MobileMenu />
          <div className="hidden md:block">
            <SearchBox />
          </div>
          <div className="flex-1 md:hidden" />
          <div className="flex items-center gap-2.5">
            <NotificationsMenu />
            <ProfileMenu />
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[84rem] px-4 py-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppStoreProvider>
      <Shell>{children}</Shell>
    </AppStoreProvider>
  );
}
