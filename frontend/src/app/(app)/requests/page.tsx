"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Clock, X } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { BorrowRequest, ExtensionRequest } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";

const statusLabels: Record<string, { label: string; variant: any; border: string }> = {
  pending: { label: "En attente", variant: "warning", border: "border-l-4 border-l-yellow-500" },
  approved: { label: "Approuvée", variant: "success", border: "border-l-4 border-l-green-500" },
  rejected: { label: "Rejetée", variant: "destructive", border: "border-l-4 border-l-destructive" },
  cancelled: { label: "Annulée", variant: "secondary", border: "" },
};

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [reqRes, extRes] = await Promise.all([
        api.get("/borrow-requests/"),
        api.get("/loans/extensions/"),
      ]);
      setRequests(reqRes.data.results || reqRes.data);
      setExtensions(extRes.data.results || extRes.data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await api.post(`/borrow-requests/${id}/cancel/`);
      fetchData();
    } catch {
      // silently fail
    }
  };

  const handleBorrowClick = (request: BorrowRequest) => {
    if (request.status === "approved") {
      router.push("/loans");
    } else if (request.status === "rejected") {
      router.push("/requests");
    }
  };

  const handleExtensionClick = (ext: ExtensionRequest) => {
    if (ext.status === "approved") {
      router.push("/loans");
    } else if (ext.status === "rejected") {
      router.push("/requests");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mes demandes</h1>

      {/* Demandes d'emprunt */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Demandes d&apos;emprunt</h2>
        {requests.length === 0 ? (
          <div className="py-8 text-center">
            <Send className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune demande d&apos;emprunt
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const statusInfo = statusLabels[request.status] || statusLabels.pending;
              const isClickable = request.status === "approved" || request.status === "rejected";
              return (
                <Card
                  key={request.id}
                  className={`${statusInfo.border} ${isClickable ? "cursor-pointer transition-colors hover:bg-muted/50" : ""}`}
                  onClick={() => handleBorrowClick(request)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{request.book.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.book.author}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Demandé le {formatDateTime(request.requested_at)}
                      </p>
                      {request.desired_return_date && (
                        <p className="text-xs text-blue-600">
                          Retour souhaité : {formatDate(request.desired_return_date)}
                        </p>
                      )}
                      {request.rejection_reason && (
                        <div className="mt-2 rounded-md bg-destructive/10 px-2 py-1.5">
                          <p className="text-sm font-medium text-destructive">
                            Raison : {request.rejection_reason}
                          </p>
                        </div>
                      )}
                      {request.status === "approved" && (
                        <p className="mt-1 text-xs text-primary">
                          Cliquez pour voir vos emprunts
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                      {request.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(request.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Demandes de prolongation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Demandes de prolongation</h2>
        {extensions.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune demande de prolongation
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {extensions.map((ext) => {
              const statusInfo = statusLabels[ext.status] || statusLabels.pending;
              return (
                <Card
                  key={ext.id}
                  className={`${(statusLabels[ext.status] || statusLabels.pending).border} ${
                    ext.status === "approved" || ext.status === "rejected"
                      ? "cursor-pointer transition-colors hover:bg-muted/50"
                      : ""
                  }`}
                  onClick={() => handleExtensionClick(ext)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">
                        {ext.loan_detail.book.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ext.loan_detail.book.author}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Échéance actuelle : {formatDate(ext.loan_detail.due_date)}
                        {" "}— Nouvelle date demandée : {formatDate(ext.new_due_date)}
                      </p>
                      {ext.reason && (
                        <p className="text-xs text-muted-foreground">
                          Raison : {ext.reason}
                        </p>
                      )}
                      {ext.rejection_reason && (
                        <div className="mt-2 rounded-md bg-destructive/10 px-2 py-1.5">
                          <p className="text-sm font-medium text-destructive">
                            Motif du rejet : {ext.rejection_reason}
                          </p>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Demandé le {formatDateTime(ext.created_at)}
                      </p>
                      {ext.status === "approved" && (
                        <p className="mt-1 text-xs text-primary">
                          Cliquez pour voir vos emprunts
                        </p>
                      )}
                    </div>
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
