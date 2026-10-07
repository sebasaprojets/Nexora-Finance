import { cn } from '@/lib/cn';

export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  if (src) return <img src={src} alt="" className={cn('size-9 rounded-full object-cover', className)} />;
  return (
    <span
      aria-hidden
      className={cn('grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#7b6dff] to-[#22d3ee] text-xs font-semibold text-white', className)}
    >
      {initials || 'N'}
    </span>
  );
}
