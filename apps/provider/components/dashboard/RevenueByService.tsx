"use client";

interface ServiceRevenue {
  service_name: string;
  revenue: number;
}

interface RevenueByServiceProps {
  data: ServiceRevenue[];
  loading: boolean;
}

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function RevenueByService({ data, loading }: RevenueByServiceProps) {
  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="font-semibold text-gray-700 text-sm mb-3">Revenue by service</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-400">No completed appointments with revenue yet</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((s) => (
            <div key={s.service_name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-700 truncate pr-2">{s.service_name}</span>
                <span className="text-gray-500 whitespace-nowrap">{formatKES(s.revenue)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div
                  className="h-1.5 bg-blue-700 rounded-full"
                  style={{ width: `${(s.revenue / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
