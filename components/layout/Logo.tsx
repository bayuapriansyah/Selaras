import Image from "next/image";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={28}
      height={21}
      aria-hidden="true"
      className={cn("size-7 object-contain", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/selaras+logo.png"
      alt=""
      width={118}
      height={28}
      aria-hidden="true"
      priority
      className={cn("h-7 w-auto object-contain", className)}
    />
  );
}
