"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BookStatusBadge } from "@/components/books/BookStatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { BookListItem } from "@/types";

export default function AdminBooksPage() {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      const { data } = await api.get("/books/");
      setBooks(data.results || data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce livre ?")) return;
    try {
      await api.delete(`/books/${id}/`);
      fetchBooks();
    } catch {
      alert("Impossible de supprimer ce livre (peut-être actuellement emprunté).");
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
        <h1 className="text-3xl font-bold">Gestion des livres</h1>
        <Link href="/admin/books/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau livre
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Titre</th>
              <th className="p-3 text-left text-sm font-medium">Auteur</th>
              <th className="p-3 text-left text-sm font-medium">Catégorie</th>
              <th className="p-3 text-left text-sm font-medium">
                Exemplaires
              </th>
              <th className="p-3 text-left text-sm font-medium">Statut</th>
              <th className="p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-b">
                <td className="p-3 text-sm font-medium">{book.title}</td>
                <td className="p-3 text-sm">{book.author}</td>
                <td className="p-3 text-sm">{book.category?.name || "—"}</td>
                <td className="p-3 text-sm">{book.number_of_copies}</td>
                <td className="p-3">
                  <BookStatusBadge availability={book.availability} />
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Link href={`/admin/books/${book.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(book.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
