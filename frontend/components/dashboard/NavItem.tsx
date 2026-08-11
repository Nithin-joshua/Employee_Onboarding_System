import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
}

export default function NavItem({ href, icon: Icon, label, active = false }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
        active
          ? 'bg-primary-dark text-white shadow-sm font-bold'
          : 'text-neutral-text hover:text-primary-dark hover:bg-neutral-bg/40'
      }`}
    >
      <Icon className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-neutral-text'}`} />
      <span>{label}</span>
    </Link>
  );
}
