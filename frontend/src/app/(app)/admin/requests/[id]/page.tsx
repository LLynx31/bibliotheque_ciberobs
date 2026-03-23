"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookStatusBadge } from "@/components/books/BookStatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { Book, BorrowRequest, ExtensionRequest } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";

const statusLabels: Record<string, { label: string; variant: any }> = {
  pending: { label: "En attente", variant: "warning" },
  approved: { label: "Approuvée", variant: "success" },
  rejected: { label: "Rejetée", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "secondary" },
};

export default function AdminBookRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<Book | null>(null);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Borrow request actions state
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveDueDates, setApproveDueDates] = useState<Record<number, string>>({});

  // Extension actions state
  const [rejectingExtId, setRejectingExtId] = useState<number | null>(null);
  const [rejectExtReason, setRejectExtReason] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [bookRes, reqRes, extRes] = await Promise.all([
        api.get(`/books/${bookId}/`),
        api.get(`/borrow-requests/?book=${bookId}`),
        api.get(`/loans/extensions/?book=${bookId}`),
      ]);
      setBook(bookRes.data);
      setRequests(reqRes.data.results || reqRes.data);
      setExtensions(extRes.data.results || extRes.data);
    } catch {
      router.push("/admin/requests");
    } finally {
      setIsLoading(false);
    }
  }, [bookId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Borrow request handlers
  const handleApprove = async (requestId: number) => {
    try {
      setRejectingId(null);
      setRejectReason("");
      const payload: any = {};
      const dueDate = approveDueDates[requestId];
      if (dueDate) payload.due_date = dueDate;
      await api.post(`/borrow-requests/${requestId}/approve/`, payload);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erreur lors de l'approbation.");
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await api.post(`/borrow-requests/${requestId}/reject/`, {
        reason: rejectReason,
      });
      setRejectingId(null);
      setRejectReason("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erreur lors du rejet.");
    }
  };

  // Extension handlers
  const handleApproveExtension = async (extId: number) => {
    try {
      await api.post(`/loans/extensions/${extId}/approve/`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erreur lors de l'approbation.");
    }
  };

  const handleRejectExtension = async (extId: number) => {
    try {
      await api.post(`/loans/extensions/${extId}/reject/`, {
        reason: rejectExtReason,
      });
      setRejectingExtId(null);
      setRejectExtReason("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erreur lors du rejet.");
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const otherRequests = requests.filter((r) => r.status !== "pending");
  const pendingExtensions = extensions.filter((e) => e.status === "pending");
  const otherExtensions = extensions.filter((e) => e.status !== "pending");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => router.push("/admin/requests")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{book.title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
              {book.category && (
                <p className="text-xs text-muted-foreground">{book.category.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <BookStatusBadge availability={book.availability} />
              <span className="text-sm text-muted-foreground">
                {book.number_of_copies} exemplaire{book.number_of_copies > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section: Demandes d'emprunt */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Demandes d&apos;emprunt
          {pendingRequests.length > 0 && (
            <Badge variant="destructive">{pendingRequests.length}</Badge>
          )}
        </h2>

        {requests.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune demande d&apos;emprunt pour ce livre
          </p>
        ) : (
          <div className="space-y-3">
            {/* Pending */}
            {pendingRequests.map((req) => (
              <Card key={req.id} className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">
                        {req.employee.last_name} {req.employee.first_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(req.requested_at)}
                      </p>
                      {req.desired_return_date && (
                        <p className="text-xs text-blue-600">
                          Retour souhaité : {formatDate(req.desired_return_date)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleApprove(req.id)}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Approuver
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          setRejectingId(rejectingId === req.id ? null : req.id)
                        }
                      >
                        <X className="mr-1 h-3 w-3" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                  {/* Date de retour */}
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Date de retour :
                    </label>
                    <Input
                      type="date"
                      value={approveDueDates[req.id] || req.desired_return_date || ""}
                      onChange={(e) =>
                        setApproveDueDates((prev) => ({
                          ...prev,
                          [req.id]: e.target.value,
                        }))
                      }
                      className="h-7 w-40 text-xs"
                    />
                  </div>
                  {rejectingId === req.id && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Raison du rejet (optionnel)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="h-7 flex-1 text-xs"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleReject(req.id)}
                      >
                        Confirmer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Historique */}
            {otherRequests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Historique ({otherRequests.length})
                </h4>
                {otherRequests.map((req) => {
                  const statusInfo = statusLabels[req.status] || statusLabels.pending;
                  return (
                    <Card key={req.id}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm">
                            {req.employee.last_name} {req.employee.first_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(req.requested_at)}
                          </p>
                          {req.rejection_reason && (
                            <p className="mt-1 text-xs text-destructive">
                              Raison : {req.rejection_reason}
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
        )}
      </div>

      {/* Section: Demandes de prolongation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Demandes de prolongation
          {pendingExtensions.length > 0 && (
            <Badge variant="destructive">{pendingExtensions.length}</Badge>
          )}
        </h2>

        {extensions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune demande de prolongation pour ce livre
          </p>
        ) : (
          <div className="space-y-3">
            {/* Pending extensions */}
            {pendingExtensions.map((ext) => (
              <Card key={ext.id} className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">
                        {ext.requested_by.last_name} {ext.requested_by.first_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Échéance actuelle : {formatDate(ext.loan_detail.due_date)}
                      </p>
                      <p className="text-xs font-medium text-blue-600">
                        Nouvelle date demandée : {formatDate(ext.new_due_date)}
                      </p>
                      {ext.reason && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Raison : {ext.reason}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(ext.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleApproveExtension(ext.id)}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Approuver
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          setRejectingExtId(
                            rejectingExtId === ext.id ? null : ext.id
                          )
                        }
                      >
                        <X className="mr-1 h-3 w-3" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                  {rejectingExtId === ext.id && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Raison du rejet (optionnel)"
                        value={rejectExtReason}
                        onChange={(e) => setRejectExtReason(e.target.value)}
                        className="h-7 flex-1 text-xs"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleRejectExtension(ext.id)}
                      >
                        Confirmer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Historique extensions */}
            {otherExtensions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Historique ({otherExtensions.length})
                </h4>
                {otherExtensions.map((ext) => {
                  const statusInfo = statusLabels[ext.status] || statusLabels.pending;
                  return (
                    <Card key={ext.id}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm">
                            {ext.requested_by.last_name} {ext.requested_by.first_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Prolongation jusqu&apos;au {formatDate(ext.new_due_date)}
                            {" — "}{formatDateTime(ext.created_at)}
                          </p>
                          {ext.rejection_reason && (
                            <p className="mt-1 text-xs text-destructive">
                              Raison : {ext.rejection_reason}
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
        )}
      </div>
    </div>
  );
}
