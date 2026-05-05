import Image from "next/image";

type ProjectLogoProps = {
  compact?: boolean;
  className?: string;
  size?: number;
};

export function ProjectLogo({ compact = false, className = "", size }: ProjectLogoProps) {
  const computed = size ?? (compact ? 20 : 32);

  const sizeClass = size ? `w-[${size}px] h-[${size}px]` : compact ? "w-5 h-5" : "w-8 h-8";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <div className={`${sizeClass} relative flex-shrink-0 rounded-lg overflow-hidden shadow-sm`} aria-hidden>
        <Image src="/my-prompt-logo.svg" alt="My Prompt" width={computed} height={computed} className="rounded-lg" />
      </div>

      {!compact ? (
        <div className="inline-flex flex-col leading-none min-w-0">
          <span className="text-lg font-semibold text-[color:var(--foreground)] truncate">My Prompt</span>
          <span className="text-xs text-[color:var(--app-muted)]">Developer AI Studio</span>
        </div>
      ) : null}
    </div>
  );
}
