"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Notification } from "@/types";
import api from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

interface NotificationToast {
  id: number;
  title: string;
  message: string;
  related_book?: number;
  notification_type?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  pendingRequestsCount: number;
  isConnected: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

function NotificationToastUI({
  toast,
  onClose,
  onClick,
}: {
  toast: NotificationToast;
  onClose: () => void;
  onClick: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

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

  return (
    <div
      className="pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 shadow-lg transition-all animate-in slide-in-from-right-5"
      onClick={onClick}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-primary">
          {typeLabels[toast.notification_type || ""] || toast.notification_type}
        </p>
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{toast.message}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const toastIdsShown = useRef(new Set<number>());

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleToastClick = useCallback(
    (toast: NotificationToast) => {
      removeToast(toast.id);
      const type = toast.notification_type;

      if (type === "new_request" && toast.related_book) {
        router.push(`/admin/requests/${toast.related_book}`);
      } else if (type === "request_rejected" || type === "extension_rejected") {
        router.push("/requests");
      } else if (type === "request_approved" || type === "extension_approved") {
        router.push("/loans");
      } else if (toast.related_book) {
        router.push(`/books/${toast.related_book}`);
      } else {
        router.push("/notifications");
      }
    },
    [router, removeToast]
  );

  const fetchPendingRequests = useCallback(async () => {
    try {
      const { data } = await api.get("/borrow-requests/?status=pending");
      const results = data.results || data;
      setPendingRequestsCount(Array.isArray(results) ? results.length : 0);
    } catch {
      // silently fail
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get("/notifications/"),
        api.get("/notifications/unread-count/"),
      ]);
      setNotifications(notifRes.data.results || notifRes.data);
      setUnreadCount(countRes.data.unread_count);
    } catch {
      // silently fail
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    // Close existing connection before creating a new one
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = getAccessToken();
    if (!token) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/notifications/?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectCount.current = 0;
    };

    ws.onmessage = (event) => {
      const notification: Notification = JSON.parse(event.data);

      // Deduplicate using a persistent ref (survives across renders)
      if (toastIdsShown.current.has(notification.id)) return;
      toastIdsShown.current.add(notification.id);

      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });

      // Fetch real count from server instead of local increment to avoid race conditions
      api.get("/notifications/unread-count/").then((res) => {
        setUnreadCount(res.data.unread_count);
      }).catch(() => {});

      // Refresh pending requests count (new borrow request or status change)
      if (notification.notification_type === "new_request" ||
          notification.notification_type === "request_approved" ||
          notification.notification_type === "request_rejected") {
        fetchPendingRequests();
      }

      // Show toast
      setToasts((prev) => [
        ...prev,
        {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          related_book: notification.related_book ?? undefined,
          notification_type: notification.notification_type,
        },
      ]);
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      if (reconnectCount.current < 10) {
        reconnectCount.current += 1;
        setTimeout(connectWebSocket, 3000);
      }
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, [fetchPendingRequests]);

  useEffect(() => {
    fetchNotifications();
    fetchPendingRequests();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fetchNotifications, fetchPendingRequests, connectWebSocket]);

  const markAsRead = async (id: number) => {
    await api.post(`/notifications/${id}/read/`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await api.post("/notifications/read-all/");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        pendingRequestsCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
      }}
    >
      {children}
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <NotificationToastUI
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
            onClick={() => handleToastClick(toast)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
