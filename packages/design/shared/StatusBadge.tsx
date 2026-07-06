import { Badge, badgeVariants } from "../ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

// Single source of truth for what every appointment status looks like,
// anywhere in the app. Previously each page (provider appointments list,
// appointment detail, health-portal appointments list, etc.) defined its
// own local color mapping independently -- meaning "confirmed" could be
// styled differently depending on which page you were looking at.
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  scheduled: "warning",
  confirmed: "success",
  "in-progress": "info",
  completed: "secondary",
  rescheduled: "outline",
  cancelled: "destructive",
  "no-show": "secondary",
  pending: "warning",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "secondary";
  const label = status.replace(/-/g, " ");
  return (
    <Badge variant={variant} className="capitalize">
      {label}
    </Badge>
  );
}
