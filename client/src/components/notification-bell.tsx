import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";

export function NotificationBell() {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count"],
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count"],
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/notifications/clear-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count"],
      });
    },
  });

  const unreadCount = unreadData?.count || 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    // Navigate to the stock recommendation page
    window.location.href = "/recommendations";
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleClearAll = () => {
    clearAllMutation.mutate();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" data-testid="popover-notifications">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={clearAllMutation.isPending}
                data-testid="button-clear-all"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll be notified of high-value opportunities and important changes
              </p>
            </div>
          ) : (
            <div className="divide-y" data-testid="list-notifications">
              {notifications.map((notification) => {
                // Determine badge content based on notification type
                const showScore = notification.type === 'high_score_buy' || notification.type === 'high_score_sell';
                const badgeVariant = notification.type === 'high_score_buy' ? 'default' : 
                                    notification.type === 'high_score_sell' ? 'destructive' :
                                    notification.type === 'popular_stock' ? 'secondary' :
                                    'outline';
                const badgeText = showScore ? `${notification.score}/100` :
                                 notification.type === 'popular_stock' ? 'Trending' :
                                 notification.type === 'stance_change' ? 'Alert' :
                                 'New';
                
                // Extract price change data from metadata
                const priceChangePercent = notification.metadata?.priceChangePercent;
                const hasPriceChange = priceChangePercent !== undefined && priceChangePercent !== null;
                const priceChangeColor = hasPriceChange 
                  ? priceChangePercent > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                  : '';
                
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover-elevate transition-colors ${
                      !notification.isRead ? "bg-accent/50" : ""
                    }`}
                    data-testid={`notification-${notification.ticker}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{notification.ticker}</span>
                          <Badge
                            variant={badgeVariant}
                            data-testid={`badge-type-${notification.ticker}`}
                          >
                            {badgeText}
                          </Badge>
                          {hasPriceChange && (
                            <Badge variant="outline" className={priceChangeColor}>
                              {priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        {notification.metadata?.currentPrice && (
                          <p className="text-xs text-muted-foreground">
                            Current: ${notification.metadata.currentPrice.toFixed(2)}
                            {notification.metadata.insiderPrice && (
                              <> · Insider: ${notification.metadata.insiderPrice.toFixed(2)}</>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
