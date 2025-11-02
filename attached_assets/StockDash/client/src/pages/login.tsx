import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

export default function Login() {
  const [, setLocation] = useLocation();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const loginMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/auth/login", { userId });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] });
      setLocation("/");
    },
  });

  const handleSelectUser = (userId: string) => {
    loginMutation.mutate(userId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">TradePro</CardTitle>
          <CardDescription className="text-lg">
            Select your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {users?.map((user) => (
            <Button
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              variant="outline"
              className="w-full h-auto p-6 justify-start gap-4 hover-elevate active-elevate-2"
              disabled={loginMutation.isPending}
              data-testid={`button-select-user-${user.name.toLowerCase()}`}
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="font-semibold text-lg">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
            </Button>
          ))}
          
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Don't have an account?
            </p>
            <Button variant="outline" asChild data-testid="button-create-account">
              <a href="/signup">Create New Account</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
