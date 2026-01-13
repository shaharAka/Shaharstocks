import { createContext, useContext, type ReactNode, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

// #region agent log
const logDebug = (location: string, message: string, data: any, hypothesisId: string) => {
  const logData = {location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId};
  console.log(`[DEBUG ${hypothesisId}]`, location, message, data);
  fetch('http://127.0.0.1:7243/ingest/9504a544-9592-4c7b-afe6-b49cb5e62f9f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e)=>console.error('Log fetch failed:',e));
};
// #endregion

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
  // #region agent log
  const renderCount = useRef(0);
  renderCount.current += 1;
  logDebug('UserContext.tsx:UserProvider', 'UserProvider render', { renderCount: renderCount.current }, 'H2');
  // #endregion
  
  const { data, isLoading, refetch } = useQuery<CurrentUserResponse>({
    queryKey: ["/api/auth/current-user"],
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchInterval: false, // Disable polling
    // Prevent refetch if we have cached data (set by login)
    refetchOnMount: (query) => {
      // If we have cached data that's less than 5 seconds old, don't refetch
      const cachedData = query.state.data;
      const dataAge = query.state.dataUpdatedAt ? Date.now() - query.state.dataUpdatedAt : Infinity;
      if (cachedData && dataAge < 5000) {
        logDebug('UserContext.tsx:UserProvider', 'Skipping refetch - fresh cached data', { 
          dataAge,
          hasUser: !!(cachedData as any)?.user 
        }, 'H2');
        return false;
      }
      return true;
    },
  });
  
  // Firebase auth state listener - sync with React Query
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      logDebug('UserContext.tsx:UserProvider', 'Firebase auth state changed', { 
        hasFirebaseUser: !!firebaseUser,
        firebaseUid: firebaseUser?.uid,
        email: firebaseUser?.email
      }, 'H2');
      
      if (firebaseUser) {
        // User is signed in - refetch current user data from backend
        // The token will be automatically included in the request via queryClient
        await refetch();
      } else {
        // User is signed out - clear user data from cache
        queryClient.setQueryData(["/api/auth/current-user"], { user: null });
      }
    });

    return () => unsubscribe();
  }, [refetch]);
  
  // #region agent log
  useEffect(() => {
    logDebug('UserContext.tsx:UserProvider', 'Query state changed', { isLoading, hasUser: !!data?.user, userId: data?.user?.id }, 'H2');
  }, [isLoading, data]);
  // #endregion

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
