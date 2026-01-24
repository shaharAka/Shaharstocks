import { cn } from "@/lib/utils";

interface LoadingStrikeBorderProps {
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

export function LoadingStrikeBorder({ 
  children, 
  className, 
  isLoading = false 
}: LoadingStrikeBorderProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative rounded-lg", className)}>
      {/* Animated border stripe that runs around the perimeter */}
      <div 
        className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden"
        style={{
          padding: '2px',
        }}
      >
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            background: `conic-gradient(
              from 0deg at 50% 50%,
              transparent 0deg,
              transparent 260deg,
              oklch(var(--primary) / 0.4) 270deg,
              oklch(var(--primary) / 0.7) 280deg,
              oklch(var(--primary) / 0.9) 285deg,
              oklch(var(--primary)) 290deg,
              oklch(var(--primary) / 0.9) 295deg,
              oklch(var(--primary) / 0.7) 300deg,
              oklch(var(--primary) / 0.4) 310deg,
              transparent 320deg,
              transparent 360deg
            )`,
            animation: 'loading-stripe-rotate 2.5s linear infinite',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
          }}
        />
      </div>
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
