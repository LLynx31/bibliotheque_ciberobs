"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  BookMarked,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { DashboardStats, MostBorrowed, Loan } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mostBorrowed, setMostBorrowed] = useState<MostBorrowed[]>([]);
  const [recentActivity, setRecentActivity] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mostBorrowedRes, activityRes] = await Promise.all([
          api.get("/dashboard/most-borrowed/"),
          api.get("/dashboard/recent-activity/"),
        ]);
        setMostBorrowed(mostBorrowedRes.data);
        setRecentActivity(activityRes.data);

        if (user?.role && user.role !== "employee") {
          const statsRes = await api.get("/dashboard/stats/");
          setStats(statsRes.data);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const maxBorrowCount = Math.max(...mostBorrowed.map((b) => b.borrow_count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tableau de bord</h1>

      {stats && user?.role && user.role !== "employee" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total livres</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_books}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emprunts actifs</CardTitle>
              <BookMarked className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_loans}</div>
            </CardContent>
          </Card>
          <Card className={stats.pending_requests > 0 ? "border-yellow-500/50 bg-yellow-50/30" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demandes en attente</CardTitle>
              <Clock className={`h-4 w-4 ${stats.pending_requests > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.pending_requests > 0 ? "text-yellow-700" : ""}`}>{stats.pending_requests}</div>
            </CardContent>
          </Card>
          <Card className={stats.overdue_loans > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En retard</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className={`font-bold text-destructive ${stats.overdue_loans > 0 ? "text-3xl" : "text-2xl"}`}>{stats.overdue_loans}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Livres les plus empruntés</CardTitle>
          </CardHeader>
          <CardContent>
            {mostBorrowed.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mostBorrowed}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 12, fill: "#002454" }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    axisLine={{ stroke: "#002454", strokeOpacity: 0.2 }}
                    tickLine={{ stroke: "#002454", strokeOpacity: 0.2 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickCount={maxBorrowCount + 1}
                    domain={[0, maxBorrowCount]}
                    interval={0}
                    tick={{ fontSize: 12, fill: "#002454" }}
                    axisLine={{ stroke: "#002454", strokeOpacity: 0.2 }}
                    tickLine={{ stroke: "#002454", strokeOpacity: 0.2 }}
                  />
                  <Tooltip
                    contentStyle={{ borderColor: "#0056B7", borderRadius: 8, color: "#002454" }}
                    cursor={{ fill: "#0056B7", fillOpacity: 0.08 }}
                  />
                  <Bar dataKey="borrow_count" fill="#0056B7" name="Emprunts" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground">Aucune donnée disponible</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 10).map((loan) => (
                  <div
                    key={loan.id}
                    className={`flex items-center justify-between rounded-md border p-3 ${
                      loan.is_active && loan.is_overdue
                        ? "border-destructive/30 bg-destructive/5"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{loan.book.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.employee.first_name} {loan.employee.last_name}
                      </p>
                    </div>
                    <div className="text-right">
                      {loan.is_active && loan.is_overdue ? (
                        <Badge variant="destructive">En retard</Badge>
                      ) : loan.is_active ? (
                        <Badge variant="default">En cours</Badge>
                      ) : (
                        <Badge variant="success">Retourné</Badge>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(loan.borrowed_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Aucune activité récente</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
