"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail && detail.toLowerCase().includes("active")) {
        setError(
          "Votre compte n'a pas encore été validé par un administrateur. Veuillez patienter."
        );
      } else {
        setError("Nom d'utilisateur ou mot de passe incorrect.");
      }
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <BookOpen className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle>Omniscia</CardTitle>
        <CardDescription>
          Connectez-vous pour accéder à la bibliothèque
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Nom d&apos;utilisateur
            </label>
            <Input
              id="username"
              type="text"
              placeholder="Votre nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Connexion..." : "Se connecter"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Créer un compte
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
