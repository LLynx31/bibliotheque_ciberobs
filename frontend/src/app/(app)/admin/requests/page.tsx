"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ClipboardList, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { BookStatusBadge } from "@/components/books/BookStatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { BookListItem, ExtensionRequest } from "@/types";

export default function AdminRequestsPage() {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);

  const fetchBooks = useCallback(async () => {
    try {
      const { data } = await api.get("/books/");
      setBooks(data.results || data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchExtensions = useCallback(async () => {
    try {
      const { data } = await api.get("/loans/extensions/?status=pending");
      setExtensions(data.results || data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchBooks();
    fetchExtensions();
  }, [fetchBooks, fetchExtensions]);

  // Count pending extensions per book
  const extensionCountByBook: Record<number, number> = {};
  extensions.forEach((ext) => {
    const bookId = ext.loan_detail?.book?.id;
    if (bookId) {
      extensionCountByBook[bookId] = (extensionCountByBook[bookId] || 0) + 1;
    }
  });

  const sortedBooks = [...books].sort((a, b) => {
    const aCount = (a.pending_requests_count || 0) + (extensionCountByBook[a.id] || 0);
    const bCount = (b.pending_requests_count || 0) + (extensionCountByBook[b.id] || 0);
    if (bCount !== aCount) return bCount - aCount;
    return a.title.localeCompare(b.title);
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestion des demandes</h1>

      {books.length === 0 ? (
        <div className="py-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">
            Aucun livre dans le catalogue
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedBooks.map((book) => {
            const pendingBorrowCount = book.pending_requests_count || 0;
            const pendingExtCount = extensionCountByBook[book.id] || 0;
            const totalPending = pendingBorrowCount + pendingExtCount;
            return (
              <Link key={book.id} href={`/admin/requests/${book.id}`}>
                <Card className={`relative h-full cursor-pointer transition-shadow hover:shadow-md ${
                  totalPending > 0
                    ? "ring-2 ring-primary/30 shadow-md"
                    : "opacity-60"
                }`}>
                  {/* Badge demandes d'emprunt */}
                  {pendingBorrowCount > 0 && (
                    <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
                      {pendingBorrowCount}
                    </div>
                  )}
                  {/* Badge demandes de prolongation */}
                  {pendingExtCount > 0 && (
                    <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow">
                      <Clock className="h-3 w-3" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                        {book.title}
                      </h3>
                      <BookStatusBadge availability={book.availability} />
                    </div>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                    {book.category && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {book.category.name}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {book.available_copies}/{book.number_of_copies} exemplaire
                      {book.number_of_copies > 1 ? "s" : ""} disponible
                      {book.available_copies > 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
