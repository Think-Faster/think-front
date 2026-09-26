import { ReactNode } from 'react';

interface BadgeProps {
  tone?: string;
  className?: string;
  children: ReactNode;
}

export default function Badge({ tone, className = '', children }: BadgeProps) {
  const classes = ['badge', tone ?? '', className].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}
