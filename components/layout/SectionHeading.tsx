import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/layout/Reveal";

type SectionHeadingProps = {
  id?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  size?: "lg" | "md";
  className?: string;
  onDark?: boolean;
};

export function SectionHeading({
  id,
  title,
  lead,
  align = "left",
  size = "lg",
  className,
  onDark = false,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className,
      )}
      amount={0.2}
    >
      <h2
        id={id}
        className={cn(
          "font-semibold tracking-[-0.03em] text-balance",
          onDark ? "text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" : "text-ink",
          size === "lg"
            ? "text-[2.1rem] leading-[1.05] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.02]"
            : "text-[1.7rem] leading-[1.1] sm:text-3xl lg:text-4xl",
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={cn(
            "max-w-[62ch] text-pretty text-base leading-relaxed sm:text-lg",
            onDark ? "text-sky-100/70" : "text-ash",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}
