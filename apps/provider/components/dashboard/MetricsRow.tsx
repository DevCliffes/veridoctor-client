interface MetricsRowProps {
  totalPatients: number;
  todayCount: number;
  weeklyCount: number;
  loading: boolean;
}

const Metric = ({
  label,
  value,
  sub,
  subColor = "text-gray-400",
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
  loading: boolean;
}) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    {loading ? (
      <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
    ) : (
      <p className="text-3xl font-medium">{value}</p>
    )}
    {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
  </div>
);

export function MetricsRow({
  totalPatients,
  todayCount,
  weeklyCount,
  loading,
}: MetricsRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric
        label="Patients today"
        value={todayCount}
        sub="scheduled appointments"
        loading={loading}
      />
      <Metric
        label="This week"
        value={weeklyCount}
        sub="↑ vs last week"
        subColor="text-green-600"
        loading={loading}
      />
      <Metric
        label="Total served"
        value={totalPatients}
        sub="all time"
        loading={loading}
      />
      <Metric
        label="Avg. consult"
        value="18 min"
        sub="target: 20 min"
        loading={loading}
      />
    </div>
  );
}

