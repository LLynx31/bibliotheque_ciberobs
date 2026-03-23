"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { Loan, User, BookListItem } from "@/types";
import { formatDate, daysUntilDue } from "@/lib/utils";

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [search, setSearch] = useState("");

  // Assign form state
  const [users, setUsers] = useState<User[]>([]);
  const [availableBooks, setAvailableBooks] = useState<BookListItem[]>([]);
  const [assignForm, setAssignForm] = useState({
    book_id: "",
    employee_id: "",
    due_date: "",
  });
  const [assignError, setAssignError] = useState("");

  // Return state
  const [returningId, setReturningId] = useState<number | null>(null);

  const fetchLoans = useCallback(async () => {
    try {
      const { data } = await api.get("/loans/", {
        params: { search: search || undefined },
      });
      setLoans(data.results || data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchLoans, 300);
    return () => clearTimeout(debounce);
  }, [fetchLoans]);

  const fetchFormData = useCallback(async () => {
    try {
      const [usersRes, booksRes] = await Promise.all([
        api.get("/users/"),
        api.get("/books/?availability=available"),
      ]);
      setUsers(usersRes.data.results || usersRes.data);
      setAvailableBooks(booksRes.data.results || booksRes.data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (showAssignForm) fetchFormData();
  }, [showAssignForm, fetchFormData]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError("");
    try {
      const payload: any = {
        book_id: parseInt(assignForm.book_id),
        employee_id: parseInt(assignForm.employee_id),
      };
      if (assignForm.due_date) {
        payload.due_date = assignForm.due_date;
      }
      await api.post("/loans/", payload);
      setShowAssignForm(false);
      setAssignForm({ book_id: "", employee_id: "", due_date: "" });
      fetchLoans();
      fetchFormData();
    } catch (err: any) {
      setAssignError(err.response?.data?.detail || "Erreur lors de l'assignation.");
    }
  };

  const handleReturn = async (loanId: number) => {
    setReturningId(loanId);
    try {
      await api.post(`/loans/${loanId}/return_book/`);
      fetchLoans();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erreur lors du retour.");
    } finally {
      setReturningId(null);
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestion des emprunts</h1>
        <Button onClick={() => setShowAssignForm(!showAssignForm)}>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Assigner un livre
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par livre, employé..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showAssignForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assigner un livre directement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssign} className="space-y-4">
              {assignError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {assignError}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Livre</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignForm.book_id}
                    onChange={(e) => setAssignForm({ ...assignForm, book_id: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un livre</option>
                    {availableBooks.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} — {book.author} ({book.available_copies} dispo.)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employé</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignForm.employee_id}
                    onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un employé</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.last_name} {user.first_name} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de retour</label>
                  <Input
                    type="date"
                    value={assignForm.due_date}
                    onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Par défaut : 30 jours
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Assigner</Button>
                <Button type="button" variant="outline" onClick={() => setShowAssignForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Livre</th>
              <th className="p-3 text-left text-sm font-medium">Employé</th>
              <th className="p-3 text-left text-sm font-medium">Date emprunt</th>
              <th className="p-3 text-left text-sm font-medium">Date retour prévue</th>
              <th className="p-3 text-left text-sm font-medium">Statut</th>
              <th className="p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => {
              const days = daysUntilDue(loan.due_date);
              const isOverdue = loan.is_overdue && !loan.returned_at;
              const isApproaching = !loan.returned_at && !loan.is_overdue && days <= 7 && days >= 0;

              const rowClass = isOverdue
                ? "border-b bg-destructive/5"
                : isApproaching
                ? "border-b bg-yellow-50/50"
                : "border-b";

              const dueDateClass = isOverdue
                ? "p-3 text-sm font-semibold text-destructive"
                : isApproaching
                ? "p-3 text-sm font-medium text-yellow-700"
                : "p-3 text-sm";

              return (
              <tr key={loan.id} className={rowClass}>
                <td className="p-3 text-sm font-medium">{loan.book.title}</td>
                <td className="p-3 text-sm">
                  {loan.employee.last_name} {loan.employee.first_name}
                </td>
                <td className="p-3 text-sm">{formatDate(loan.borrowed_at)}</td>
                <td className={dueDateClass}>
                  {formatDate(loan.due_date)}
                  {isOverdue && (
                    <span className="ml-1 text-xs">({Math.abs(days)}j retard)</span>
                  )}
                  {isApproaching && (
                    <span className="ml-1 text-xs">(dans {days}j)</span>
                  )}
                </td>
                <td className="p-3">
                  {loan.returned_at ? (
                    <Badge variant="success">Retourné le {formatDate(loan.returned_at)}</Badge>
                  ) : loan.is_overdue ? (
                    <Badge variant="destructive">En retard</Badge>
                  ) : (
                    <Badge variant="default">En cours</Badge>
                  )}
                </td>
                <td className="p-3">
                  {!loan.returned_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={returningId === loan.id}
                      onClick={() => handleReturn(loan.id)}
                    >
                      <RotateCcw className={`mr-1 h-3 w-3 ${returningId === loan.id ? "animate-spin" : ""}`} />
                      Retourné
                    </Button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
