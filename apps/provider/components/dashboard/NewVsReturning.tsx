"use client";

interface NewVsReturningProps {
  newCount: number;
  returningCount: number;
  loading: boolean;
}

export function NewVsReturning({ newCount, returningCount, loading }: NewVsReturningProps) {
  const total = newCount + returningCount;
  const newPct = total > 0 ? Math.round((newCount / total) * 100) : 0;
  const returningPct = total > 0 ? 100 - newPct : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-gray-700 text-sm">New vs returning patients</p>
        <span className="text-xs text-gray-400">This month</span>
      </div>

      {loading ? (
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse" />
      ) : total === 0 ? (
        <p className="text-sm text-gray-400">No patients this month</p>
      ) : (
        <>
          <div className="flex h-2.5 rounded-full overflow-hidden">
            <div className="bg-blue-700" style={{ width: `${newPct}%` }} />
            <div className="bg-blue-200" style={{ width: `${returningPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-blue-700 inline-block" />
              New {newPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-blue-200 inline-block" />
              Returning {returningPct}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
