import type { ReactNode } from 'react';

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  iconColor: string;
}
