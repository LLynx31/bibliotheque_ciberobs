"use client";

import { useState, useEffect } from "react";
import { BookMarked, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { Loan } from "@/types";
import { formatDate, daysUntilDue } from "@/lib/utils";

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [extendingId, setExtendingId] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [extensionMessage, setExtensionMessage] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const { data } = await api.get("/loans/");
        setLoans(data.results || data);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchLoans();
  }, []);

  const handleExtensionRequest = async (loanId: number) => {
    if (!newDueDate) {
      setExtensionMessage((prev) => ({
        ...prev,
        [loanId]: "Veuillez choisir une date.",
      }));
      return;
    }
    try {
      await api.post("/loans/extensions/", {
        loan: loanId,
        new_due_date: newDueDate,
        reason: extensionReason,
      });
      setExtensionMessage((prev) => ({
        ...prev,
        [loanId]: "Demande de prolongation envoyée !",
      }));
      setExtendingId(null);
      setNewDueDate("");
      setExtensionReason("");
    } catch (err: any) {
      setExtensionMessage((prev) => ({
        ...prev,
        [loanId]:
          err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          "Erreur lors de l'envoi.",
      }));
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
      <h1 className="text-3xl font-bold">Mes emprunts</h1>

      {loans.length === 0 ? (
        <div className="py-12 text-center">
          <BookMarked className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">
            Vous n&apos;avez aucun emprunt
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const days = daysUntilDue(loan.due_date);
            const isOverdue = loan.is_overdue && !loan.returned_at;
            const isApproaching = !loan.returned_at && !loan.is_overdue && days <= 7 && days >= 0;
            const isUrgent = isOverdue || isApproaching;

            const cardClass = isOverdue
              ? "border-l-4 border-l-destructive bg-destructive/5"
              : isApproaching
              ? "border-l-4 border-l-yellow-500 bg-yellow-50/50"
              : "";

            return (
            <Card key={loan.id} className={cardClass}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{loan.book.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {loan.book.author}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Emprunté le {formatDate(loan.borrowed_at)} —{" "}
                      {isOverdue ? (
                        <span className="font-semibold text-destructive">
                          Retour prévu le {formatDate(loan.due_date)} (en retard de {Math.abs(days)} jour{Math.abs(days) > 1 ? "s" : ""})
                        </span>
                      ) : isApproaching ? (
                        <span className="font-semibold text-yellow-700">
                          Retour prévu le {formatDate(loan.due_date)} (dans {days} jour{days > 1 ? "s" : ""})
                        </span>
                      ) : (
                        <span>Retour prévu le {formatDate(loan.due_date)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {loan.returned_at ? (
                      <Badge variant="success">
                        Retourné le {formatDate(loan.returned_at)}
                      </Badge>
                    ) : loan.is_overdue ? (
                      <Badge variant="destructive">En retard</Badge>
                    ) : (
                      <Badge variant="default">En cours</Badge>
                    )}
                    {loan.is_active && !loan.returned_at && (
                      <Button
                        variant={isUrgent ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          setExtendingId(
                            extendingId === loan.id ? null : loan.id
                          )
                        }
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Prolonger
                      </Button>
                    )}
                  </div>
                </div>

                {extensionMessage[loan.id] && (
                  <div
                    className={`mt-2 rounded-md p-2 text-xs ${
                      extensionMessage[loan.id].includes("envoyée")
                        ? "bg-green-50 text-green-800"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {extensionMessage[loan.id]}
                  </div>
                )}

                {extendingId === loan.id && (
                  <div className="mt-3 space-y-2 rounded-md border p-3">
                    <p className="text-xs font-medium">Demande de prolongation</p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                        Nouvelle date :
                      </label>
                      <Input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        min={loan.due_date}
                        className="h-7 w-40 text-xs"
                      />
                    </div>
                    <Input
                      placeholder="Raison (optionnel)"
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleExtensionRequest(loan.id)}
                      >
                        Envoyer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setExtendingId(null);
                          setNewDueDate("");
                          setExtensionReason("");
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
