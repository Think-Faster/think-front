import { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  className?: string;
}

export default function Tag({ children, className = '' }: TagProps) {
  return <span className={`sensor-tag ${className}`.trim()}>{children}</span>;
}
