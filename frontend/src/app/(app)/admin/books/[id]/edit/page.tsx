"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { Category } from "@/types";

export default function EditBookPage() {
  const params = useParams();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "",
    author: "",
    edition: "",
    publisher: "",
    year_published: "",
    category_name: "",
    description: "",
    number_of_copies: "1",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const fetchCategories = () => {
    api.get("/books/categories/").then(({ data }) => setCategories(data)).catch(() => {});
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const { data } = await api.get(`/books/${params.id}/`);
        setForm({
          title: data.title || "",
          author: data.author || "",
          edition: data.edition || "",
          publisher: data.publisher || "",
          year_published: data.year_published?.toString() || "",
          category_name: data.category?.name || "",
          description: data.description || "",
          number_of_copies: data.number_of_copies?.toString() || "1",
        });
      } catch {
        router.push("/admin/books");
      } finally {
        setIsLoading(false);
      }
    };
    fetchBook();
  }, [params.id, router]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    setCategoryError("");
    try {
      const response = await api.post("/books/categories/", {
        name: newCategoryName.trim(),
      });
      
      // Vérifier que la réponse contient bien id et name
      if (!response.data?.id || !response.data?.name) {
        throw new Error("Réponse invalide du serveur");
      }
      
      // Ajouter la catégorie au select
      setCategories((prev: any) => [...prev, response.data]);
      // Sélectionner la nouvelle catégorie
      setForm((prev: any) => ({ ...prev, category_name: response.data.name }));
      // Fermer le dialog
      setShowNewCategory(false);
      setNewCategoryName("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.name?.[0] || 
                       err.response?.data?.detail || 
                       err.message || 
                       "Erreur lors de la création de la catégorie";
      setCategoryError(errorMsg);
      console.error("Erreur création catégorie:", err.response?.data || err.message);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        title: form.title,
        author: form.author,
        year_published: form.year_published ? parseInt(form.year_published) : null,
        number_of_copies: parseInt(form.number_of_copies) || 1,
        edition: form.edition || null,
        publisher: form.publisher || null,
        category_name: form.category_name || null,
        description: form.description || null,
      };
      await api.patch(`/books/${params.id}/`, payload);
      router.push("/admin/books");
    } catch (err: any) {
      setError(JSON.stringify(err.response?.data) || "Erreur lors de la modification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Modifier le livre</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titre *</label>
                <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Auteur *</label>
                <Input value={form.author} onChange={(e) => updateField("author", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Édition</label>
                <Input value={form.edition} onChange={(e) => updateField("edition", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Éditeur</label>
                <Input value={form.publisher} onChange={(e) => updateField("publisher", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Année de publication</label>
                <Input type="number" value={form.year_published} onChange={(e) => updateField("year_published", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Catégorie</label>
                <div className="flex gap-2">
                  <select
                    value={form.category_name}
                    onChange={(e) => updateField("category_name", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— Aucune —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewCategory(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre d&apos;exemplaires</label>
                <Input type="number" min="1" value={form.number_of_copies} onChange={(e) => updateField("number_of_copies", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Popup création catégorie */}
      <Dialog open={showNewCategory} onOpenChange={setShowNewCategory}>
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {categoryError && (
            <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {categoryError}
            </div>
          )}
          <Input
            placeholder="Nom de la catégorie"
            value={newCategoryName}
            onChange={(e: any) => setNewCategoryName(e.target.value)}
            disabled={isCreatingCategory}
            autoFocus
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateCategory}
              disabled={isCreatingCategory || !newCategoryName.trim()}
            >
              {isCreatingCategory ? "Création..." : "Créer"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewCategory(false);
                setCategoryError("");
              }}
              disabled={isCreatingCategory}
            >
              Annuler
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
