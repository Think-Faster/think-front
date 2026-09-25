interface ProgressBarProps {
  percent: number;
}

export default function ProgressBar({ percent }: ProgressBarProps) {
  return (
    <div className="pd-bar">
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}
