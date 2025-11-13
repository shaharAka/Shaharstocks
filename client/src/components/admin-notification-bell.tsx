import { useState } from "react";
import { Bell, UserPlus } from "lucide-react";
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
import type { AdminNotification } from "@shared/schema";

export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  
  const { data: notifications = [] } = useQuery<AdminNotification[]>({
    queryKey: ["/api/admin/notifications"],
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/notifications/unread-count"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest("POST", `/api/admin/notifications/${notificationId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/notifications/unread-count"],
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/admin/notifications/mark-all-read", {});
      return result;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/notifications/unread-count"] });
      const previousCount = queryClient.getQueryData(["/api/admin/notifications/unread-count"]);
      queryClient.setQueryData(["/api/admin/notifications/unread-count"], { count: 0 });
      return { previousCount };
    },
    onError: (err, variables, context) => {
      if (context?.previousCount) {
        queryClient.setQueryData(["/api/admin/notifications/unread-count"], context.previousCount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/notifications/unread-count"],
      });
    },
  });

  const unreadCount = unreadData?.count || 0;

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "user_signup":
        return UserPlus;
      default:
        return Bell;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative h-11 w-11"
          data-testid="button-admin-notifications"
        >
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? "text-primary" : ""}`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-xs"
              data-testid="badge-admin-notification-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" data-testid="popover-admin-notifications">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">Admin Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-notifications-read"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see new user signups here
              </p>
            </div>
          ) : (
            <div className="divide-y" data-testid="list-admin-notifications">
              {notifications.map((notification) => {
                const TypeIcon = getTypeIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                    className={`p-4 cursor-pointer hover-elevate focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      !notification.isRead ? "bg-accent/50" : ""
                    }`}
                    data-testid={`admin-notification-${notification.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 shrink-0" />
                          <span className="font-semibold">{notification.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        {notification.metadata?.userEmail && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Email:</span> {notification.metadata.userEmail}
                          </div>
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
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
