import { Badge } from "@/components/ui/Badge";

interface BookStatusBadgeProps {
  availability: "available" | "borrowed" | "reserved";
}

const statusMap = {
  available: { label: "Disponible", variant: "success" as const },
  borrowed: { label: "Emprunté", variant: "destructive" as const },
  reserved: { label: "Réservé", variant: "warning" as const },
};

export function BookStatusBadge({ availability }: BookStatusBadgeProps) {
  const status = statusMap[availability] || statusMap.available;
  return <Badge variant={status.variant}>{status.label}</Badge>;
}
