import React from 'react';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 10,
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-border fill-transparent"
          strokeWidth={strokeWidth}
        />
        {/* Animated Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-accent fill-transparent transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {/* Central Percent Text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-primary-dark select-none">{clampedPercent}%</span>
        <span className="text-[10px] text-neutral-text font-medium uppercase tracking-wider">done</span>
      </div>
    </div>
  );
}
