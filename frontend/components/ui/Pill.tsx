import React from 'react';

interface PillProps {
  status: 'success' | 'error' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export default function Pill({ status, children, className = '' }: PillProps) {
  const statusStyles = {
    success: 'bg-success-bg text-success-text',
    error: 'bg-error-bg text-error-text',
    neutral: 'bg-neutral-bg text-neutral-text',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors duration-200 ${statusStyles[status]} ${className}`}
    >
      {children}
    </span>
  );
}
