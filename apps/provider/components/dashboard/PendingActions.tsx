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
      urgency: upcomingCount > 0 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-400",
      href: "/appointments?filter=upcoming",
    },
    {
      label: "Prescriptions to sign",
      count: 0,
      urgency: "bg-gray-100 text-gray-400",
      href: "/prescriptions",
    },
    {
      label: "Unread messages",
      count: 0,
      urgency: "bg-gray-100 text-gray-400",
      href: "/calls",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <h2 className="font-semibold text-gray-700 mb-3">Pending Actions</h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm text-gray-700">{item.label}</span>
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
