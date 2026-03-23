"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/Card";
import { useNotifications } from "@/context/NotificationContext";
import { Notification } from "@/types";
import { timeAgo } from "@/lib/utils";

const typeStyles: Record<string, { border: string; borderRead: string; label: string; labelRead: string; ring: string; dot: string; badge: string }> = {
  loan_overdue:        { border: "border-l-4 border-l-destructive bg-destructive/10", borderRead: "border-l-4 border-l-destructive/40 bg-destructive/[0.03]", label: "text-destructive font-semibold", labelRead: "text-destructive/60", ring: "ring-destructive/30 shadow-destructive/10", dot: "bg-destructive", badge: "bg-destructive text-white" },
  request_rejected:    { border: "border-l-4 border-l-destructive bg-destructive/10", borderRead: "border-l-4 border-l-destructive/40 bg-destructive/[0.03]", label: "text-destructive font-semibold", labelRead: "text-destructive/60", ring: "ring-destructive/30 shadow-destructive/10", dot: "bg-destructive", badge: "bg-destructive text-white" },
  extension_rejected:  { border: "border-l-4 border-l-destructive bg-destructive/10", borderRead: "border-l-4 border-l-destructive/40 bg-destructive/[0.03]", label: "text-destructive font-semibold", labelRead: "text-destructive/60", ring: "ring-destructive/30 shadow-destructive/10", dot: "bg-destructive", badge: "bg-destructive text-white" },
  loan_due:            { border: "border-l-4 border-l-yellow-500 bg-yellow-50/50", borderRead: "border-l-4 border-l-yellow-400/40 bg-yellow-50/20", label: "text-yellow-700 font-semibold", labelRead: "text-yellow-600/60", ring: "ring-yellow-400/30 shadow-yellow-400/10", dot: "bg-yellow-500", badge: "bg-yellow-500 text-white" },
  request_approved:    { border: "border-l-4 border-l-green-500 bg-green-50/50", borderRead: "border-l-4 border-l-green-400/40 bg-green-50/20", label: "text-green-700 font-semibold", labelRead: "text-green-600/60", ring: "ring-green-400/30 shadow-green-400/10", dot: "bg-green-500", badge: "bg-green-500 text-white" },
  extension_approved:  { border: "border-l-4 border-l-green-500 bg-green-50/50", borderRead: "border-l-4 border-l-green-400/40 bg-green-50/20", label: "text-green-700 font-semibold", labelRead: "text-green-600/60", ring: "ring-green-400/30 shadow-green-400/10", dot: "bg-green-500", badge: "bg-green-500 text-white" },
  new_book:            { border: "border-l-4 border-l-primary bg-primary/10", borderRead: "border-l-4 border-l-primary/40 bg-primary/[0.03]", label: "text-primary font-semibold", labelRead: "text-primary/60", ring: "ring-primary/30 shadow-primary/10", dot: "bg-primary", badge: "bg-primary text-primary-foreground" },
  book_available:      { border: "border-l-4 border-l-primary bg-primary/10", borderRead: "border-l-4 border-l-primary/40 bg-primary/[0.03]", label: "text-primary font-semibold", labelRead: "text-primary/60", ring: "ring-primary/30 shadow-primary/10", dot: "bg-primary", badge: "bg-primary text-primary-foreground" },
  new_request:         { border: "border-l-4 border-l-primary bg-primary/10", borderRead: "border-l-4 border-l-primary/40 bg-primary/[0.03]", label: "text-primary font-semibold", labelRead: "text-primary/60", ring: "ring-primary/30 shadow-primary/10", dot: "bg-primary", badge: "bg-primary text-primary-foreground" },
  new_account:         { border: "border-l-4 border-l-primary bg-primary/10", borderRead: "border-l-4 border-l-primary/40 bg-primary/[0.03]", label: "text-primary font-semibold", labelRead: "text-primary/60", ring: "ring-primary/30 shadow-primary/10", dot: "bg-primary", badge: "bg-primary text-primary-foreground" },
  account_activated:   { border: "border-l-4 border-l-green-500 bg-green-50/50", borderRead: "border-l-4 border-l-green-400/40 bg-green-50/20", label: "text-green-700 font-semibold", labelRead: "text-green-600/60", ring: "ring-green-400/30 shadow-green-400/10", dot: "bg-green-500", badge: "bg-green-500 text-white" },
};

const typeLabels: Record<string, string> = {
  new_book: "Nouveau livre",
  book_available: "Livre disponible",
  request_approved: "Demande approuvée",
  request_rejected: "Demande rejetée",
  new_request: "Nouvelle demande",
  loan_due: "Rappel d'échéance",
  loan_overdue: "Prêt en retard",
  new_account: "Nouveau compte",
  account_activated: "Compte activé",
  extension_approved: "Prolongation approuvée",
  extension_rejected: "Prolongation rejetée",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, markAllAsRead, unreadCount } = useNotifications();

  // Capture IDs that were unread when the page first loaded
  const unreadIdsRef = useRef<Set<number> | null>(null);
  if (unreadIdsRef.current === null) {
    unreadIdsRef.current = new Set(
      notifications.filter((n) => !n.is_read).map((n) => n.id)
    );
  }

  // Auto-mark all as read after a short delay so user can see the highlights
  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => markAllAsRead(), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    const type = notification.notification_type;

    // Admin: nouvelle demande → page dédiée du livre
    if (type === "new_request" && notification.related_book) {
      router.push(`/admin/requests/${notification.related_book}`);
      return;
    }

    // Demande rejetée → mes demandes
    if (type === "request_rejected" || type === "extension_rejected") {
      router.push("/requests");
      return;
    }

    // Demande approuvée ou prolongation approuvée → mes emprunts
    if (type === "request_approved" || type === "extension_approved") {
      router.push("/loans");
      return;
    }

    // Livre disponible ou autre → page du livre
    if (notification.related_book) {
      router.push(`/books/${notification.related_book}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="py-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">
            Aucune notification
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const type = notification.notification_type;
            const isClickable =
              !!notification.related_book ||
              type === "request_rejected" ||
              type === "extension_rejected" ||
              type === "request_approved" ||
              type === "extension_approved";
            const wasUnread = unreadIdsRef.current?.has(notification.id) ?? false;
            const defaults = { border: "", borderRead: "", label: "text-primary", labelRead: "text-primary/60", ring: "ring-primary/30 shadow-primary/10", dot: "bg-primary", badge: "bg-primary text-primary-foreground" };
            const style = typeStyles[type] || defaults;
            return (
              <Card
                key={notification.id}
                className={`transition-all duration-300 ${
                  wasUnread
                    ? `${style.border} ring-2 ${style.ring} shadow-md`
                    : `${style.borderRead}`
                } ${isClickable ? "cursor-pointer hover:brightness-95" : ""}`}
                onClick={() => isClickable && handleNotificationClick(notification)}
              >
                <CardContent className="flex items-start justify-between p-4">
                  {wasUnread && (
                    <div className="mr-3 mt-1 flex-shrink-0">
                      <span className="relative flex h-3 w-3">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${style.dot} opacity-75`} />
                        <span className={`relative inline-flex h-3 w-3 rounded-full ${style.dot}`} />
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-medium ${wasUnread ? style.label : style.labelRead}`}>
                        {typeLabels[notification.notification_type] ||
                          notification.notification_type}
                      </p>
                      {wasUnread && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                          Nouveau
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 font-medium ${wasUnread ? "text-foreground" : "text-foreground/50"}`}>{notification.title}</p>
                    <p className={`text-sm ${wasUnread ? "text-foreground/80" : "text-foreground/40"}`}>
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
