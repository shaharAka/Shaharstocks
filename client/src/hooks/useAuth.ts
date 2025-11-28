import { useCallback } from "react";
import { useUser } from "@/contexts/UserContext";

export function useAuth() {
  const userContext = useUser();

  const login = useCallback(() => {
    window.location.href = "/api/login";
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  const displayName = userContext.user 
    ? (userContext.user.firstName && userContext.user.lastName
        ? `${userContext.user.firstName} ${userContext.user.lastName}`.trim()
        : userContext.user.email || 'User')
    : '';

  return {
    ...userContext,
    login,
    logout,
    isAuthenticated: !!userContext.user,
    displayName,
  };
}
