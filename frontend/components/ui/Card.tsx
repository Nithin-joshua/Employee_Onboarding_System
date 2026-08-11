import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-border shadow-sm p-6 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
