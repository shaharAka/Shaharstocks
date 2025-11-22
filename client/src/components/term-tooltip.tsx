import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GlossaryTerm } from "@shared/schema";

interface TermTooltipProps {
  term: string;
  children: string;
  className?: string;
}

/**
 * TermTooltip component - Shows financial term definitions on hover
 * 
 * Usage:
 *   <TermTooltip term="RSI">RSI</TermTooltip>
 *   <TermTooltip term="P&L">profit margins</TermTooltip>
 * 
 * Features:
 * - Underlines the term to indicate it's interactive
 * - Shows definition tooltip on hover
 * - Matches term case-insensitively and supports synonyms
 * - Loads all glossary terms once and caches them
 */
export function TermTooltip({ term, children, className = "" }: TermTooltipProps) {
  // Fetch all glossary terms once and cache
  const { data: glossaryTerms } = useQuery<GlossaryTerm[]>({
    queryKey: ["/api/glossary"],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - glossary changes rarely
  });

  // Find the matching term (case-insensitive, checks term and synonyms)
  const matchedTerm = glossaryTerms?.find(
    (gt) =>
      gt.term.toLowerCase() === term.toLowerCase() ||
      gt.synonyms?.some((syn) => syn.toLowerCase() === term.toLowerCase())
  );

  // If no definition found, render plain text
  if (!matchedTerm) {
    return <span className={className}>{children}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            className={`underline decoration-dotted decoration-muted-foreground underline-offset-4 cursor-help ${className}`}
            data-testid={`term-tooltip-${term.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-1">
            <div className="font-semibold text-sm">{matchedTerm.term}</div>
            <div className="text-xs text-muted-foreground">{matchedTerm.definition}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
