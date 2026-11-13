import type { SectionType } from '@luna/shared';
import { Image, LayoutGrid, Mail, Monitor, Type, User } from 'lucide-react';

const icons: Record<SectionType, typeof Monitor> = {
  hero: Monitor,
  biography: User,
  gallery: Image,
  contact: Mail,
  text: Type,
};

export function SectionIcon({ type, className = 'size-[22px]' }: { type: SectionType; className?: string }) {
  const Icon = icons[type] ?? LayoutGrid;
  return <Icon className={className} aria-hidden />;
}
