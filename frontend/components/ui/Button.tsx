import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export default function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-full px-5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-primary-dark hover:bg-opacity-90 text-white shadow-sm',
    secondary: 'bg-mint hover:bg-opacity-80 text-primary-dark',
    outline: 'border border-border hover:bg-neutral-bg/30 text-primary-dark',
    danger: 'bg-error-bg hover:bg-opacity-80 text-error-text',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
