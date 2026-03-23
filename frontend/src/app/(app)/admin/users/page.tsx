"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Pencil, Search, UserCheck, UserX } from "lucide-react";
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
import { User } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "employee",
  });
  const [formError, setFormError] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users/", {
        params: { search: search || undefined },
      });
      setUsers(data.results || data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const resetForm = () => {
    setForm({
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      role: "employee",
    });
    setEditingUser(null);
    setShowForm(false);
    setFormError("");
  };

  const handleToggleActive = async (u: User) => {
    setTogglingId(u.id);
    try {
      const action = u.is_active ? "deactivate" : "activate";
      await api.post(`/users/${u.id}/${action}/`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erreur lors de la modification.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: "",
      role: user.role,
    });
    setShowForm(true);
    setFormError("");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await api.post("/users/", form);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setFormError(
        JSON.stringify(err.response?.data) || "Erreur lors de la création."
      );
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError("");
    try {
      const payload: Record<string, string> = {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
      };
      if (form.password) {
        payload.password = form.password;
      }
      await api.patch(`/users/${editingUser.id}/`, payload);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setFormError(
        JSON.stringify(err.response?.data) || "Erreur lors de la modification."
      );
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
        <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, prénom, email..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingUser ? "Modifier l'utilisateur" : "Créer un utilisateur"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              {formError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    value={form.last_name}
                    onChange={(e) =>
                      setForm({ ...form, last_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prénom</label>
                  <Input
                    value={form.first_name}
                    onChange={(e) =>
                      setForm({ ...form, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Nom d&apos;utilisateur
                    </label>
                    <Input
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Mot de passe{editingUser ? " (laisser vide pour ne pas changer)" : ""}
                  </label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    required={!editingUser}
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rôle</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value })
                    }
                  >
                    <option value="employee">Employé</option>
                    <option value="book_manager">Gestionnaire livres</option>
                    <option value="request_manager">Gestionnaire demandes</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingUser ? "Enregistrer" : "Créer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {users.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">
            Aucun utilisateur
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Nom</th>
                <th className="p-3 text-left text-sm font-medium">Utilisateur</th>
                <th className="p-3 text-left text-sm font-medium">Email</th>
                <th className="p-3 text-left text-sm font-medium">Rôle</th>
                <th className="p-3 text-left text-sm font-medium">Statut</th>
                <th className="p-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3 text-sm">
                    {u.last_name} {u.first_name}
                  </td>
                  <td className="p-3 text-sm">{u.username}</td>
                  <td className="p-3 text-sm">{u.email}</td>
                  <td className="p-3">
                    <Badge variant={u.role === "admin" ? "default" : u.role === "employee" ? "secondary" : "outline"}>
                      {{ admin: "Admin", employee: "Employé", book_manager: "Gest. livres", request_manager: "Gest. demandes" }[u.role] || u.role}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={u.is_active ? "success" : "destructive"}>
                      {u.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={togglingId === u.id}
                        onClick={() => handleToggleActive(u)}
                        title={u.is_active ? "Désactiver le compte" : "Activer le compte"}
                      >
                        {u.is_active ? (
                          <UserX className="h-4 w-4 text-destructive" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
