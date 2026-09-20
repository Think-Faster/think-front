import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary';
}

export default function Button({
  variant = 'default',
  className = '',
  ...rest
}: ButtonProps) {
  const classes = ['btn', variant === 'primary' ? 'primary' : '', className]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...rest} />;
}
