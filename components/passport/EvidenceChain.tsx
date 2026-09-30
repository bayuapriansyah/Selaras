import { cn } from "@/lib/utils";

export const chainLabels = [
  "Patient",
  "Provider",
  "Treatment",
  "Note",
  "Billing",
  "Claim",
] as const;

export function EvidenceChain({
  className,
  activeUntil = chainLabels.length,
  onDark = false,
}: {
  className?: string;
  activeUntil?: number;
  onDark?: boolean;
}) {
  return (
    <ol
      className={cn("list-none", className)}
      aria-label="Rantai bukti pelayanan"
    >
      {chainLabels.map((label, index) => {
        const active = index < activeUntil;
        return (
          <li
            key={label}
            className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0"
          >
            <span
              className={cn(
                "flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors duration-500",
                active
                  ? onDark
                    ? "text-leaf-100"
                    : "text-forest-800"
                  : onDark
                    ? "text-ivory/45"
                    : "text-ash",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-[2px] transition-colors duration-500",
                  active
                    ? onDark
                      ? "bg-leaf-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                      : "bg-leaf-600"
                    : onDark
                      ? "bg-white/15"
                      : "bg-hairline",
                )}
              />
              {label}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "hidden h-4 w-px bg-forest-900/20 sm:mb-1 sm:ml-[3px] sm:mt-1.5 sm:block",
                onDark && "bg-white/12",
                index === chainLabels.length - 1 && "sm:hidden",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}
