import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'quiet';
const cls: Record<Variant, string> = { primary: 'btn-primary', ghost: 'btn-ghost', quiet: 'btn-quiet' };

export function ButtonLink({ href, children, variant = 'primary', arrow = false, className = '', onClick }: { href: string; children: ReactNode; variant?: Variant; arrow?: boolean; className?: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={`${cls[variant]} ${className}`}>
      {children}
      {arrow && <ArrowRight className="h-4 w-4" />}
    </Link>
  );
}
