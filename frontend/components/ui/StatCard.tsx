import React from 'react';
import Card from './Card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delta?: {
    text: string;
    type: 'success' | 'error' | 'neutral';
  };
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  iconBgColor = 'bg-mint',
  iconColor = 'text-primary-dark',
  className = '',
}: StatCardProps) {
  const deltaStyles = {
    success: 'text-success-text bg-success-bg',
    error: 'text-error-text bg-error-bg',
    neutral: 'text-neutral-text bg-neutral-bg',
  };

  return (
    <Card className={`flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex justify-between items-start">
        {/* Icon Circle Badge */}
        <div className={`p-3 rounded-full ${iconBgColor} ${iconColor} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {/* Delta Status Badge */}
        {delta && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${deltaStyles[delta.type]}`}>
            {delta.text}
          </span>
        )}
      </div>
      <div className="mt-4">
        {/* Bold Metric Value */}
        <h3 className="text-2xl font-bold text-primary-dark tracking-tight">{value}</h3>
        {/* Muted Label */}
        <p className="text-xs font-semibold text-neutral-text mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </Card>
  );
}
