"use client";
interface CompletionRateProps {
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
  completionRate: number;
  loading: boolean;
}
export function CompletionRate({
  completedCount,
  noShowCount,
  cancelledCount,
  completionRate,
  loading,
}: CompletionRateProps) {
  const total = completedCount + noShowCount + cancelledCount;
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-foreground text-sm">Appointment completion rate</p>
        <span className="text-xs text-muted-foreground">This month</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-muted rounded animate-pulse" />
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">No resolved appointments yet</p>
      ) : (
        <>
          <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {completedCount} completed · {noShowCount} no-show · {cancelledCount} cancelled
          </p>
        </>
      )}
    </div>
  );
}
