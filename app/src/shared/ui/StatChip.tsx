interface StatChipProps {
  value: string;
  label: string;
  tone?: string;
}

export default function StatChip({ value, label, tone = '' }: StatChipProps) {
  return (
    <div className={`status-item ${tone}`}>
      <span className="status-num">{value}</span>
      <span className="status-label">{label}</span>
    </div>
  );
}
