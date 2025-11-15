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
      <div 
        className="absolute inset-0 rounded-lg opacity-75"
        style={{
          background: 'linear-gradient(90deg, transparent, oklch(var(--primary)), transparent)',
          backgroundSize: '200% 100%',
          animation: 'loading-strike 2s linear infinite',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '2px',
        }}
      />
      <div className="relative bg-card rounded-lg">
        {children}
      </div>
    </div>
  );
}
