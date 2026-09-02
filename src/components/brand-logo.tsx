import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      className={`brand-logo ${className}`.trim()}
      src="/images/nexaro%20logo.png"
      alt="Nexaro"
      width={670}
      height={544}
    />
  );
}
