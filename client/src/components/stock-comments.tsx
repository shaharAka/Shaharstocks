import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import type { StockCommentWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface StockCommentsProps {
  ticker: string;
}

export function StockComments({ ticker }: StockCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  const { data: comments = [], isLoading: commentsLoading } = useQuery<StockCommentWithUser[]>({
    queryKey: ["/api/stocks", ticker, "comments"],
    queryFn: () => fetch(`/api/stocks/${ticker}/comments`).then(res => res.json()),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { userId: string; comment: string }) => {
      const response = await fetch(`/api/stocks/${ticker}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create comment");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks", ticker, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-comment-counts"] });
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    createCommentMutation.mutate({
      userId: currentUser.id,
      comment: newComment.trim(),
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "just now";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  if (commentsLoading) {
    return (
      <Card data-testid="card-comments-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discussion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-stock-comments">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment List */}
        <div className="space-y-3 max-h-96 overflow-y-auto" data-testid="container-comments-list">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-comments">
              No comments yet. Start the discussion!
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-md bg-muted/50"
                data-testid={`comment-${comment.id}`}
              >
                <Avatar className="h-8 w-8" style={{ backgroundColor: comment.user.avatarColor }}>
                  <AvatarFallback className="text-white" style={{ backgroundColor: comment.user.avatarColor }}>
                    {getInitials(comment.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium" data-testid={`text-comment-author-${comment.id}`}>
                      {comment.user.name}
                    </span>
                    <span className="text-xs text-muted-foreground" data-testid={`text-comment-time-${comment.id}`}>
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm" data-testid={`text-comment-content-${comment.id}`}>
                    {comment.comment}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Comment Form */}
        {currentUser && (
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-new-comment">
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your comment..."
                className="resize-none text-sm"
                rows={2}
                data-testid="textarea-comment"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim() || createCommentMutation.isPending}
                data-testid="button-send-comment"
                className="h-11 w-11"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
