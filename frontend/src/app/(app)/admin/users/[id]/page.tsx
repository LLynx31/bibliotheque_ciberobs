"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { User, Loan } from "@/types";
import { formatDate } from "@/lib/utils";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchData = async () => {
    try {
      const [userRes, loansRes] = await Promise.all([
        api.get(`/users/${params.id}/`),
        api.get(`/users/${params.id}/loans/`),
      ]);
      setUser(userRes.data);
      setLoans(loansRes.data);
    } catch {
      router.push("/admin/users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleToggleActive = async () => {
    if (!user) return;
    setToggling(true);
    try {
      const action = user.is_active ? "deactivate" : "activate";
      await api.post(`/users/${user.id}/${action}/`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erreur lors de la modification.");
    } finally {
      setToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {user.last_name} {user.first_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Utilisateur :</span>{" "}
            {user.username}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Email :</span>{" "}
            {user.email}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Département :</span>{" "}
            {user.department || "Non spécifié"}
          </p>
          <div className="flex items-center gap-3">
            <Badge variant={user.role === "admin" ? "default" : user.role === "employee" ? "secondary" : "outline"}>
              {{ admin: "Admin", employee: "Employé", book_manager: "Gest. livres", request_manager: "Gest. demandes" }[user.role]}
            </Badge>
            <Badge variant={user.is_active ? "success" : "destructive"}>
              {user.is_active ? "Actif" : "Inactif"}
            </Badge>
            <Button
              variant={user.is_active ? "destructive" : "default"}
              size="sm"
              disabled={toggling}
              onClick={handleToggleActive}
            >
              {user.is_active ? (
                <><UserX className="mr-1.5 h-4 w-4" />Désactiver</>
              ) : (
                <><UserCheck className="mr-1.5 h-4 w-4" />Activer</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des emprunts</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <p className="text-muted-foreground">Aucun emprunt</p>
          ) : (
            <div className="space-y-3">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{loan.book.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Du {formatDate(loan.borrowed_at)} au{" "}
                      {formatDate(loan.due_date)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      loan.returned_at
                        ? "success"
                        : loan.is_overdue
                        ? "destructive"
                        : "default"
                    }
                  >
                    {loan.returned_at
                      ? "Retourné"
                      : loan.is_overdue
                      ? "En retard"
                      : "En cours"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
