"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { BookStatusBadge } from "@/components/books/BookStatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import api from "@/lib/api";
import { Book } from "@/types";
import { formatDate } from "@/lib/utils";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [desiredReturnDate, setDesiredReturnDate] = useState("");

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const { data } = await api.get(`/books/${params.id}/`);
        setBook(data);
      } catch {
        router.push("/books");
      } finally {
        setIsLoading(false);
      }
    };
    fetchBook();
  }, [params.id, router]);

  const handleBorrowRequest = async () => {
    if (!book) return;
    setIsRequesting(true);
    setRequestMessage("");
    try {
      const payload: any = { book_id: book.id };
      if (desiredReturnDate) {
        payload.desired_return_date = desiredReturnDate;
      }
      await api.post("/borrow-requests/", payload);
      setRequestMessage("Demande d'emprunt envoyée avec succès !");
    } catch (err: any) {
      setRequestMessage(
        err.response?.data?.detail ||
          err.response?.data?.book_id?.[0] ||
          "Erreur lors de l'envoi de la demande."
      );
    } finally {
      setIsRequesting(false);
    }
  };

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
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{book.title}</CardTitle>
              <p className="mt-1 text-lg text-muted-foreground">
                {book.author}
              </p>
            </div>
            <BookStatusBadge availability={book.availability} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {book.edition && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Édition
                </p>
                <p>{book.edition}</p>
              </div>
            )}
            {book.publisher && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Éditeur
                </p>
                <p>{book.publisher}</p>
              </div>
            )}
            {book.year_published && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Année de publication
                </p>
                <p>{book.year_published}</p>
              </div>
            )}
            {book.category && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Catégorie
                </p>
                <p>{book.category.name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Nombre d&apos;exemplaires
              </p>
              <p>{book.number_of_copies}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Ajouté le
              </p>
              <p>{formatDate(book.created_at)}</p>
            </div>
          </div>

          {book.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Description
              </p>
              <p className="mt-1">{book.description}</p>
            </div>
          )}

          {requestMessage && (
            <div
              className={`rounded-md p-3 text-sm ${
                requestMessage.includes("succès")
                  ? "bg-green-50 text-green-800"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {requestMessage}
            </div>
          )}

          {book.is_available ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Date de retour souhaitée (optionnel)
                </label>
                <Input
                  type="date"
                  value={desiredReturnDate}
                  onChange={(e) => setDesiredReturnDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  className="w-48"
                />
              </div>
              <Button onClick={handleBorrowRequest} disabled={isRequesting}>
                <Send className="mr-2 h-4 w-4" />
                {isRequesting
                  ? "Envoi en cours..."
                  : "Demander l'emprunt"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ce livre n&apos;est pas disponible actuellement.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
