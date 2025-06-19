import Image from 'next/image';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'transparent-white';
}

export default function Logo({ className = '', variant = 'full' }: LogoProps) {
  const src = variant === 'transparent-white' ? '/nk-logo-tp-white.png' : '/nk-logo-full.svg';
  
  return (
    <div className={className}>
      <Image
        src={src}
        alt="Newskoop"
        width={200}
        height={50}
        className="h-[48px] w-auto object-contain"
        style={{ backgroundColor: 'transparent' }}
        priority
      />
    </div>
  );
} 