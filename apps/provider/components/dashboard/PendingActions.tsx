"use client";
import { useRouter } from "next/navigation";
interface PendingActionsProps {
  upcomingCount: number;
  loading: boolean;
}
export function PendingActions({ upcomingCount, loading }: PendingActionsProps) {
  const router = useRouter();
  const items = [
    {
      label: "Upcoming appointments",
      count: upcomingCount,
      urgency: upcomingCount > 0 ? "bg-yellow-100 text-yellow-700" : "bg-muted text-muted-foreground",
      href: "/appointments?filter=upcoming",
    },
    {
      label: "Prescriptions to sign",
      count: 0,
      urgency: "bg-muted text-muted-foreground",
      href: "/prescriptions",
    },
    {
      label: "Unread messages",
      count: 0,
      urgency: "bg-muted text-muted-foreground",
      href: "/calls",
    },
  ];
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-6">
      <h2 className="font-semibold text-foreground mb-3">Pending Actions</h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-accent transition-colors text-left"
            >
              <span className="text-sm text-foreground">{item.label}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.urgency}`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
