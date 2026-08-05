// 8-bar sparkline of pushed count per week, current week highlighted --ok
// (UX spec §3.2 stat rail).

export default function Sparkline({ data }: { data: { week: string; pushed: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.pushed));
  const currentWeek = data[data.length - 1]?.week;
  return (
    <div
      className="flex items-end gap-[3px]"
      style={{ height: 28 }}
      role="img"
      aria-label={`Last ${data.length} weeks pushed: ${data.map(d => d.pushed).join(', ')}`}
    >
      {data.map(d => {
        const isCurrent = d.week === currentWeek;
        const h = Math.max(2, Math.round((d.pushed / max) * 28));
        return (
          <div
            key={d.week}
            title={`${d.week}: ${d.pushed} pushed`}
            style={{
              width: 5,
              height: h,
              borderRadius: 2,
              background: isCurrent ? 'var(--ok)' : 'var(--line-2)',
              boxShadow: isCurrent ? '0 0 6px rgba(34,197,94,0.5)' : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
