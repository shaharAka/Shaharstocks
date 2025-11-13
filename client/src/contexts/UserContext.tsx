import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface CurrentUserResponse {
  user: User | null;
}

interface UserProgress {
  onboardingCompletedAt: Date | null;
  tutorialCompletions: Record<string, boolean>;
}

type ExperienceState = "loading" | "onboarding_pending" | "tutorial_pending" | "complete";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  progress: UserProgress | null;
  progressLoading: boolean;
  progressFetched: boolean;
  experienceState: ExperienceState;
  completeOnboarding: () => Promise<void>;
  completeTutorial: (tutorialId: string) => Promise<void>;
  isTutorialCompleted: (tutorialId: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery<CurrentUserResponse>({
    queryKey: ["/api/auth/current-user"],
  });

  const { data: progressData, isLoading: progressLoading, isFetched: progressFetched } = useQuery<UserProgress>({
    queryKey: ["/api/user/progress"],
    enabled: !!data?.user,
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/user/complete-onboarding");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
    },
  });

  const completeTutorialMutation = useMutation({
    mutationFn: async (tutorialId: string) => {
      await apiRequest("POST", `/api/user/tutorial/${tutorialId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
    },
  });

  const experienceState: ExperienceState = (() => {
    // No user (guest/anonymous) - complete state, tutorials won't fire without progress data
    if (!data?.user) return "complete";
    
    // User is logged in, but progress hasn't been fetched yet - loading state
    if (!progressFetched || progressLoading) return "loading";
    
    // Progress data not available after fetch - treat as complete for safety
    if (!progressData) return "complete";
    
    // Check onboarding completion - handle legacy users
    const hasCompletedOnboarding = 
      progressData.onboardingCompletedAt !== null || 
      data.user.hasSeenOnboarding === true;
    
    if (!hasCompletedOnboarding) {
      return "onboarding_pending";
    }
    
    // Onboarding is complete, check if any tutorials are pending
    // For now, we consider all tutorials complete once onboarding is done
    // (users can manually replay tutorials via help button)
    return "complete";
  })();

  const isTutorialCompleted = (tutorialId: string): boolean => {
    return progressData?.tutorialCompletions[tutorialId] === true;
  };

  return (
    <UserContext.Provider 
      value={{ 
        user: data?.user || null, 
        isLoading,
        progress: progressData || null,
        progressLoading,
        progressFetched,
        experienceState,
        completeOnboarding: async () => {
          await completeOnboardingMutation.mutateAsync();
        },
        completeTutorial: async (tutorialId: string) => {
          await completeTutorialMutation.mutateAsync(tutorialId);
        },
        isTutorialCompleted,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
