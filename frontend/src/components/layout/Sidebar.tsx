"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  BookMarked,
  Send,
  Bell,
  Users,
  Library,
  ClipboardList,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useMemo } from "react";

const employeeLinks = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/books", label: "Livres", icon: BookOpen },
  { href: "/loans", label: "Mes emprunts", icon: BookMarked },
  { href: "/requests", label: "Mes demandes", icon: Send },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

type AdminLink = { href: string; label: string; icon: typeof Users; roles: string[] };

const allAdminLinks: AdminLink[] = [
  { href: "/admin/users", label: "Utilisateurs", icon: Users, roles: ["admin"] },
  { href: "/admin/books", label: "Gestion livres", icon: Library, roles: ["admin", "book_manager"] },
  { href: "/admin/loans", label: "Gestion emprunts", icon: ArrowLeftRight, roles: ["admin", "request_manager"] },
  { href: "/admin/requests", label: "Gestion demandes", icon: ClipboardList, roles: ["admin", "request_manager"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount, pendingRequestsCount } = useNotifications();

  const getBadge = (href: string): number => {
    if (href === "/notifications") return unreadCount;
    if (href === "/admin/requests") return pendingRequestsCount;
    return 0;
  };

  const managerLinks = useMemo(() => {
    if (!user) return [];
    return allAdminLinks.filter((link) => link.roles.includes(user.role));
  }, [user]);

  return (
    <aside className="flex h-full w-64 flex-col" style={{ background: "hsl(214.3 100% 16.5%)" }}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <BookOpen className="mr-2 h-6 w-6" style={{ color: "hsl(41.2 100% 55.5%)" }} />
        <span className="text-lg font-heading font-bold text-white">Omniscia</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase text-white/50">
          Menu
        </p>
        {employeeLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          const badge = getBadge(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-[hsl(41.2,100%,55.5%)]")} />
              <span className="flex-1">{link.label}</span>
              {badge > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                  style={{
                    background: isActive ? "hsl(41.2 100% 55.5%)" : "hsl(0 84.2% 60.2%)",
                    color: isActive ? "hsl(214.3 100% 16.5%)" : "#fff",
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}

        {managerLinks.length > 0 && (
          <>
            <div className="my-4 border-t border-white/10" />
            <p className="mb-2 px-2 text-xs font-semibold uppercase text-white/50">
              {user?.role === "admin" ? "Administration" : "Gestion"}
            </p>
            {managerLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              const badge = getBadge(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive && "text-[hsl(41.2,100%,55.5%)]")} />
                  <span className="flex-1">{link.label}</span>
                  {badge > 0 && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                      style={{
                        background: isActive ? "hsl(41.2 100% 55.5%)" : "hsl(0 84.2% 60.2%)",
                        color: isActive ? "hsl(214.3 100% 16.5%)" : "#fff",
                      }}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
