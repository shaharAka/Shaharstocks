import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbsUp, Trash2, CheckCircle2, Lightbulb, MessageSquare, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type FeatureSuggestion = {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  userName: string;
  userHasVoted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function Community() {
  const { user } = useUser();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all suggestions for stats (unfiltered)
  const { data: allSuggestions = [] } = useQuery<FeatureSuggestion[]>({
    queryKey: ["/api/feature-suggestions", user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) params.append("userId", user.id);
      
      const url = `/api/feature-suggestions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch suggestions");
      return response.json();
    },
  });

  // Fetch filtered suggestions for display
  const { data: suggestions = [], isLoading } = useQuery<FeatureSuggestion[]>({
    queryKey: ["/api/feature-suggestions", user?.id, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) params.append("userId", user.id);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const url = `/api/feature-suggestions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch suggestions");
      return response.json();
    },
  });

  // Sort suggestions by vote count (descending), then by creation date
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      return apiRequest("POST", "/api/feature-suggestions", {
        userId: user?.id,
        title: data.title,
        description: data.description,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-suggestions"] });
      setTitle("");
      setDescription("");
      toast({
        title: "Success",
        description: "Your feature suggestion has been submitted!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feature suggestion",
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ suggestionId, isVoting }: { suggestionId: string; isVoting: boolean }) => {
      const method = isVoting ? "POST" : "DELETE";
      return apiRequest(method, `/api/feature-suggestions/${suggestionId}/vote`, {
        userId: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-suggestions"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update vote",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const adminSecret = localStorage.getItem("ADMIN_SECRET") || "";
      const response = await fetch(`/api/feature-suggestions/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-suggestions"] });
      toast({
        title: "Success",
        description: "Suggestion status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const adminSecret = localStorage.getItem("ADMIN_SECRET") || "";
      const response = await fetch(`/api/feature-suggestions/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-secret": adminSecret,
        },
      });
      if (!response.ok) throw new Error("Failed to delete suggestion");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-suggestions"] });
      toast({
        title: "Success",
        description: "Suggestion deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete suggestion",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ title, description });
  };

  const handleVote = (suggestionId: string, userHasVoted: boolean) => {
    voteMutation.mutate({ suggestionId, isVoting: !userHasVoted });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" data-testid={`badge-status-pending`}>Pending</Badge>;
      case "roadmap":
        return <Badge className="bg-green-500 hover:bg-green-600" data-testid={`badge-status-roadmap`}>On Roadmap</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-community">Community Board</h1>
          <p className="text-muted-foreground">Suggest features and vote on what matters most</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle data-testid="heading-submit-idea">Submit Your Idea</CardTitle>
            <CardDescription>Share a feature you'd like to see in TradePro</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="text-sm font-medium mb-2 block">
                  Feature Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of your feature idea"
                  data-testid="input-title"
                />
              </div>
              <div>
                <label htmlFor="description" className="text-sm font-medium mb-2 block">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain your feature idea in detail. What problem does it solve? How would it help?"
                  rows={4}
                  data-testid="textarea-description"
                />
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit-suggestion"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Suggestions</span>
              <span className="text-2xl font-bold" data-testid="text-total-suggestions">
                {allSuggestions.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">On Roadmap</span>
              <span className="text-2xl font-bold text-green-600" data-testid="text-roadmap-count">
                {allSuggestions.filter((s) => s.status === "roadmap").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Votes</span>
              <span className="text-2xl font-bold" data-testid="text-total-votes">
                {allSuggestions.reduce((sum, s) => sum + s.voteCount, 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-suggestions">
          <MessageSquare className="h-6 w-6" />
          Feature Suggestions
        </h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suggestions</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="roadmap">On Roadmap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-loading">
          Loading suggestions...
        </div>
      ) : sortedSuggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p data-testid="text-no-suggestions">
              No suggestions yet. Be the first to submit an idea!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedSuggestions.map((suggestion) => (
            <Card key={suggestion.id} data-testid={`card-suggestion-${suggestion.id}`}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant={suggestion.userHasVoted ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleVote(suggestion.id, suggestion.userHasVoted)}
                      disabled={voteMutation.isPending}
                      data-testid={`button-vote-${suggestion.id}`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-bold" data-testid={`text-vote-count-${suggestion.id}`}>
                      {suggestion.voteCount}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1" data-testid={`text-title-${suggestion.id}`}>
                          {suggestion.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Suggested by <span className="font-medium">{suggestion.userName}</span> •{" "}
                          {formatDistanceToNow(new Date(suggestion.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {getStatusBadge(suggestion.status)}
                    </div>

                    <p className="text-muted-foreground" data-testid={`text-description-${suggestion.id}`}>
                      {suggestion.description}
                    </p>

                    {user?.isAdmin && (
                      <div className="flex gap-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground mr-2">Admin:</span>
                        {suggestion.status !== "roadmap" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "roadmap" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-add-roadmap-${suggestion.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Add to Roadmap
                          </Button>
                        )}
                        {suggestion.status === "roadmap" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "pending" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-remove-roadmap-${suggestion.id}`}
                          >
                            Remove from Roadmap
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this suggestion?")) {
                              deleteMutation.mutate(suggestion.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${suggestion.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
