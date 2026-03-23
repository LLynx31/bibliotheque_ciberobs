"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Bell, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Bonjour,{" "}
          <span className="font-medium text-foreground">
            {user?.first_name || user?.username}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => router.push("/notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>

        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent"
        >
          <UserCircle className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {user?.last_name} {user?.first_name}
          </span>
          {user?.role && user.role !== "employee" && (
            <Badge variant="secondary">
              {user.role === "admin" ? "Admin" : user.role === "book_manager" ? "Gest. livres" : "Gest. demandes"}
            </Badge>
          )}
        </Link>

        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
