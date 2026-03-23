"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BookStatusBadge } from "@/components/books/BookStatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { BookListItem, Category } from "@/types";

export default function BooksPage() {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get("/books/categories/").then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (selectedCategory) params.category = selectedCategory;
        if (availabilityFilter) params.availability = availabilityFilter;
        const { data } = await api.get("/books/", { params });
        setBooks(data.results || data);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchBooks, 300);
    return () => clearTimeout(debounce);
  }, [search, selectedCategory, availabilityFilter]);

  // Group books by category
  const booksByCategory: Record<string, BookListItem[]> = {};
  books.forEach((book) => {
    const catName = book.category?.name || "Sans catégorie";
    if (!booksByCategory[catName]) booksByCategory[catName] = [];
    booksByCategory[catName].push(book);
  });
  const sortedCategories = Object.keys(booksByCategory).sort((a, b) => {
    if (a === "Sans catégorie") return 1;
    if (b === "Sans catégorie") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Catalogue des livres</h1>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, auteur..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="available">Disponible</option>
          <option value="borrowed">Emprunté</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : books.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">
            Aucun livre trouvé
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map((catName) => (
            <div key={catName}>
              <h2 className="mb-4 text-xl font-semibold">{catName}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {booksByCategory[catName].map((book) => {
                  const avail = book.available_copies;
                  const cardBorder =
                    avail === 0
                      ? "border-l-4 border-l-destructive/40 opacity-75"
                      : avail === 1
                      ? "border-l-4 border-l-yellow-400"
                      : "";
                  const availClass =
                    avail === 0
                      ? "mt-2 text-xs font-semibold text-destructive"
                      : avail === 1
                      ? "mt-2 text-xs font-medium text-yellow-700"
                      : "mt-2 text-xs text-muted-foreground";
                  const availText =
                    avail === 0
                      ? "Aucun exemplaire disponible"
                      : `${avail}/${book.number_of_copies} exemplaire${book.number_of_copies > 1 ? "s" : ""} disponible${avail > 1 ? "s" : ""}`;

                  return (
                  <Link key={book.id} href={`/books/${book.id}`}>
                    <Card className={`transition-shadow hover:shadow-md ${cardBorder}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="line-clamp-2 text-base">
                          {book.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {book.author}
                        </p>
                        <p className={availClass}>
                          {availText}
                        </p>
                        <div className="mt-2">
                          <BookStatusBadge availability={book.availability} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
