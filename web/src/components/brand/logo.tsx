import Image from 'next/image';
import Link from 'next/link';

const ICON = '/brand/logo-icon.png';
const WORDMARK = '/brand/logo-wordmark.png';

type LogoTone = 'light' | 'dark';

const toneClass: Record<LogoTone, string> = {
  /** White transparent PNG — default on dark backgrounds */
  light: 'brand-logo',
  /** Black-on-white source — invert for dark UI */
  dark: 'brand-logo-invert',
};

export function DeeloIcon({
  size = 36,
  className = '',
  tone = 'light',
}: {
  size?: number;
  className?: string;
  tone?: LogoTone;
}) {
  return (
    <Image
      src={ICON}
      alt="Deelo"
      width={size}
      height={size}
      className={`${toneClass[tone]} ${className}`}
      priority
      unoptimized
    />
  );
}

export function DeeloWordmark({
  height = 28,
  className = '',
  tone = 'light',
}: {
  height?: number;
  className?: string;
  tone?: LogoTone;
}) {
  const width = Math.round(height * 3.35);
  return (
    <Image
      src={WORDMARK}
      alt="deelo"
      width={width}
      height={height}
      className={`${toneClass[tone]} h-auto w-auto ${className}`}
      style={{ height, width: 'auto', maxWidth: width }}
      priority
      unoptimized
    />
  );
}

export function DeeloLogoLink({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 transition">
      <span className="brand-logo-mark">
        <DeeloIcon size={34} className="transition-transform duration-300 group-hover:scale-105" />
      </span>
      {variant === 'full' && (
        <span className="hidden sm:block pt-0.5">
          <DeeloWordmark height={24} />
        </span>
      )}
    </Link>
  );
}
