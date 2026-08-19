interface LogoProps {
  className?: string;
}

/** Clock hands over a globe meridian -- a compact mark for "Europe Time Machine". */
export default function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="13.5" stroke="#ffb703" strokeWidth="1.6" />
      <ellipse cx="16" cy="16" rx="5.5" ry="13.5" stroke="#5c7a9c" strokeWidth="1" />
      <line x1="16" y1="2.5" x2="16" y2="29.5" stroke="#5c7a9c" strokeWidth="1" />
      <line x1="16" y1="16" x2="16" y2="8" stroke="#f5f0e6" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="16" x2="21.5" y2="19.2" stroke="#f5f0e6" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="#ffb703" />
    </svg>
  );
}
