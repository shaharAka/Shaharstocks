import { Button } from "@/components/ui/button";
import { Pin } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Stock } from "@shared/schema";

interface PinButtonProps {
  ticker: string;
  isPinned: boolean;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function PinButton({ 
  ticker, 
  isPinned, 
  variant = "ghost", 
  size = "icon",
  showLabel = false 
}: PinButtonProps) {
  const { toast } = useToast();

  const togglePinMutation = useMutation({
    mutationFn: async (shouldPin: boolean) => {
      if (shouldPin) {
        return apiRequest("POST", `/api/stocks/${ticker}/pin`, null);
      } else {
        return apiRequest("DELETE", `/api/stocks/${ticker}/pin`, null);
      }
    },
    onMutate: async (shouldPin) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/stocks/with-user-status"] });

      // Snapshot the previous value
      const previousStocks = queryClient.getQueryData<Stock[]>(["/api/stocks/with-user-status"]);

      // Optimistically update the cache
      queryClient.setQueryData<Stock[]>(
        ["/api/stocks/with-user-status"],
        (old) => {
          if (!old) return old;
          return old.map((stock) =>
            stock.ticker === ticker
              ? { ...stock, isPinned: shouldPin }
              : stock
          );
        }
      );

      // Also update rejected stocks if they exist
      const previousRejected = queryClient.getQueryData<Stock[]>(["/api/stocks", "rejected"]);
      queryClient.setQueryData<Stock[]>(
        ["/api/stocks", "rejected"],
        (old) => {
          if (!old) return old;
          return old.map((stock) =>
            stock.ticker === ticker
              ? { ...stock, isPinned: shouldPin }
              : stock
          );
        }
      );

      // Return context with previous values for rollback
      return { previousStocks, previousRejected };
    },
    onSuccess: () => {
      // Invalidate queries after mutation succeeds to sync with server state
      // This ensures multi-device consistency and handles reload scenarios
      // Note: Optimistic updates provide instant feedback, this ensures eventual consistency
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/with-user-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks", "rejected"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/pins"] });
    },
    onError: (err, shouldPin, context) => {
      // Rollback on error
      if (context?.previousStocks) {
        queryClient.setQueryData(["/api/stocks/with-user-status"], context.previousStocks);
      }
      if (context?.previousRejected) {
        queryClient.setQueryData(["/api/stocks", "rejected"], context.previousRejected);
      }
      
      toast({
        title: "Error",
        description: shouldPin ? "Failed to pin stock" : "Failed to unpin stock",
        variant: "destructive",
      });
    },
  });

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    togglePinMutation.mutate(!isPinned);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleTogglePin}
      disabled={togglePinMutation.isPending}
      data-testid={`button-pin-${ticker}`}
      className={isPinned ? "text-primary" : ""}
    >
      <Pin className={`h-4 w-4 ${isPinned ? "fill-current" : ""} ${showLabel ? "mr-2" : ""}`} />
      {showLabel && (isPinned ? "Unpin" : "Pin")}
    </Button>
  );
}
