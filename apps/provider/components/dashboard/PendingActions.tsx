"use client";
import { useRouter } from "next/navigation";

const PENDING_ITEMS = [
  {
    label: "Lab results to review",
    count: 0,
    urgency: "bg-red-100 text-red-700",
    href: "/patients",
  },
  {
    label: "Prescriptions to sign",
    count: 0,
    urgency: "bg-yellow-100 text-yellow-700",
    href: "/prescriptions",
  },
  {
    label: "Unread messages",
    count: 0,
    urgency: "bg-blue-100 text-blue-700",
    href: "/calls",
  },
];

export function PendingActions() {
  const router = useRouter();
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <h2 className="font-semibold text-gray-700 mb-3">Pending Actions</h2>
      <div className="space-y-2">
        {PENDING_ITEMS.map((item) => (
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
    </div>
  );
}
