import { ReactNode } from 'react';

interface EmptyStateProps {
  children: ReactNode;
}

export default function EmptyState({ children }: EmptyStateProps) {
  return <div className="empty-note">{children}</div>;
}
