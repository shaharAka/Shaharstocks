import { useState } from "react";
import { Gift, Sparkles, RefreshCw, Wrench, Megaphone } from "lucide-react";
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
import type { Announcement } from "@shared/schema";

type AnnouncementWithReadStatus = Announcement & { readAt?: Date | null };

export function AnnouncementBell() {
  const [open, setOpen] = useState(false);
  
  const { data: announcements = [] } = useQuery<AnnouncementWithReadStatus[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/announcements/unread-count"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: (announcementId: string) =>
      apiRequest("POST", "/api/announcements/mark-read", { announcementId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/announcements/unread-count"],
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      console.log("API call: mark-all-read starting");
      const result = await apiRequest("POST", "/api/announcements/mark-all-read", {});
      console.log("API call: mark-all-read completed", result);
      return result;
    },
    onMutate: async () => {
      console.log("onMutate: Setting unread count to 0");
      // Optimistically update the unread count to 0 immediately
      await queryClient.cancelQueries({ queryKey: ["/api/announcements/unread-count"] });
      const previousCount = queryClient.getQueryData(["/api/announcements/unread-count"]);
      console.log("onMutate: Previous count was", previousCount);
      queryClient.setQueryData(["/api/announcements/unread-count"], { count: 0 });
      return { previousCount };
    },
    onError: (err, variables, context) => {
      console.error("onError: API call failed", err);
      // Revert on error
      if (context?.previousCount) {
        queryClient.setQueryData(["/api/announcements/unread-count"], context.previousCount);
      }
    },
    onSuccess: () => {
      console.log("onSuccess: Invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/announcements/unread-count"],
      });
    },
  });

  const unreadCount = unreadData?.count || 0;

  const handleAnnouncementClick = (announcement: AnnouncementWithReadStatus) => {
    if (!announcement.readAt) {
      markAsReadMutation.mutate(announcement.id);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log("handleOpenChange called:", { newOpen, unreadCount });
    // When opening the popover, mark all as read first
    if (newOpen && unreadCount > 0) {
      console.log("Calling markAllAsReadMutation");
      markAllAsReadMutation.mutate();
    }
    setOpen(newOpen);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "default";
      case "update":
        return "secondary";
      case "maintenance":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return Sparkles;
      case "update":
        return RefreshCw;
      case "maintenance":
        return Wrench;
      default:
        return Megaphone;
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative h-11 w-11"
          data-testid="button-announcements"
        >
          <Gift className={`h-5 w-5 ${unreadCount > 0 ? "text-orange-500 dark:text-orange-400" : ""}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" data-testid="popover-announcements">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Announcements</h3>
        </div>
        <ScrollArea className="h-80">
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No announcements yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Check back for updates and new features
              </p>
            </div>
          ) : (
            <div className="divide-y" data-testid="list-announcements">
              {announcements.map((announcement) => {
                const TypeIcon = getTypeIcon(announcement.type);
                return (
                  <div
                    key={announcement.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleAnnouncementClick(announcement)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleAnnouncementClick(announcement);
                      }
                    }}
                    className={`p-4 cursor-pointer hover-elevate focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      !announcement.readAt ? "bg-accent/50" : ""
                    }`}
                    data-testid={`announcement-${announcement.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 shrink-0" />
                          <span className="font-semibold">{announcement.title}</span>
                          <Badge variant={getTypeColor(announcement.type)} className="capitalize">
                            {announcement.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(announcement.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!announcement.readAt && (
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
