import Image from 'next/image';
import Link from 'next/link';

const ICON = '/brand/logo-icon.png';
const WORDMARK = '/brand/logo-wordmark.png';

export function DeeloIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src={ICON}
      alt="Deelo"
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
      priority
    />
  );
}

export function DeeloWordmark({ height = 28, className = '' }: { height?: number; className?: string }) {
  const width = Math.round(height * 3.2);
  return (
    <Image
      src={WORDMARK}
      alt="deelo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}

export function DeeloLogoLink({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 transition">
      <DeeloIcon size={36} className="shadow-lg shadow-accent/25 transition-transform duration-300 group-hover:scale-105" />
      {variant === 'full' && (
        <span className="hidden sm:block">
          <DeeloWordmark height={22} />
        </span>
      )}
    </Link>
  );
}
