"use client";

interface PendingItem {
  label: string;
  count: number;
  urgency: "high" | "medium" | "low";
  href: string;
}

const PENDING_ITEMS: PendingItem[] = [
  { label: "Lab results to review", count: 0, urgency: "high", href: "/patients" },
  { label: "Prescriptions to sign", count: 0, urgency: "medium", href: "/forms" },
  { label: "Unread messages", count: 0, urgency: "low", href: "/calls" },
];

const urgencyStyles = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

export function PendingActions() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <h2 className="font-semibold text-gray-700 mb-3">Pending Actions</h2>
      <div className="space-y-2">
        {PENDING_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm text-gray-700">{item.label}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urgencyStyles[item.urgency]}`}>
              {item.count}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
