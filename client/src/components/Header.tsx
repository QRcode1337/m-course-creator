import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen,
  Brain,
  Calendar,
  FileUp,
  FolderOpen,
  Menu,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const navItems = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/import", label: "Import", icon: FileUp },
  { href: "/flashcards", label: "Flashcards", icon: Brain },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

function isActivePath(currentPath: string, href: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function Header() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
      <div className="container flex min-h-16 items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary)/0.62)_100%)] text-primary-foreground shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">Course OS</div>
              <div className="text-lg font-semibold leading-none">m-course-creator</div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(location, item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 rounded-full px-4"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <div className="hidden rounded-full border border-border/70 bg-muted/60 px-3 py-1.5 text-right lg:block">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Active user</div>
            <div className="text-sm font-medium leading-none">{user?.name || user?.email || "Local User"}</div>
          </div>

          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/create">
            <Button size="sm" className="gap-2 rounded-full px-4">
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link href="/create">
            <Button size="sm" className="rounded-full px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="mt-8 space-y-6">
                <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Signed in as</div>
                  <div className="mt-2 text-base font-semibold">{user?.name || "Local User"}</div>
                  <div className="text-sm text-muted-foreground">{user?.email}</div>
                </div>

                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(location, item.href);
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                        <Button
                          variant={active ? "secondary" : "ghost"}
                          className="w-full justify-start gap-3 rounded-2xl px-4 py-6"
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                  <Link href="/settings" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3 rounded-2xl px-4 py-6">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
