interface ErrorDisplayProps {
  error: string;
  className?: string;
}

export default function ErrorDisplay({ error, className = "" }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className={`p-3 rounded-xl bg-red-50 border border-red-200 ${className}`}>
      <p className="text-xs text-red-600 font-light">{error}</p>
    </div>
  );
}

