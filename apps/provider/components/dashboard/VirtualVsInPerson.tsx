"use client";

interface VirtualVsInPersonProps {
  virtualCount: number;
  physicalCount: number;
  loading: boolean;
}

export function VirtualVsInPerson({ virtualCount, physicalCount, loading }: VirtualVsInPersonProps) {
  const total = virtualCount + physicalCount;
  const virtualPct = total > 0 ? Math.round((virtualCount / total) * 100) : 0;
  const physicalPct = total > 0 ? 100 - virtualPct : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-gray-700 text-sm">Virtual vs in-person appointments</p>
        <span className="text-xs text-gray-400">This month</span>
      </div>

      {loading ? (
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse" />
      ) : total === 0 ? (
        <p className="text-sm text-gray-400">No appointments this month</p>
      ) : (
        <>
          <div className="flex h-2.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600" style={{ width: `${virtualPct}%` }} />
            <div className="bg-indigo-200" style={{ width: `${physicalPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-indigo-600 inline-block" />
              Virtual {virtualPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-indigo-200 inline-block" />
              In-person {physicalPct}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
