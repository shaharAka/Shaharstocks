import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tutorial } from "./tutorial";
import { getTutorialIdFromRoute, TutorialId } from "@/config/tutorials";
import { useUser } from "@/contexts/UserContext";
import type { Stock } from "@shared/schema";

export function TutorialManager() {
  const [location] = useLocation();
  const [forceTutorialId, setForceTutorialId] = useState<TutorialId | null>(null);
  const [manualTrigger, setManualTrigger] = useState(false);
  const prevTutorialIdRef = useRef<TutorialId | null>(null);
  const { user, experienceState, isTutorialCompleted, completeTutorial, progressLoading, progressFetched } = useUser();

  // Fetch stocks with user status to check for high signals
  const { data: stocks = [] } = useQuery<any[]>({
    queryKey: ["/api/stocks/with-user-status"],
    enabled: !!user && experienceState === "complete" && location === "/recommendations",
  });

  // Fetch analyses to get signal scores  
  const { data: analyses = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-analyses"],
    enabled: !!user && experienceState === "complete" && location === "/recommendations",
  });

  // Note: We don't need to fetch followed stocks here since the event is dispatched
  // from the follow mutation itself when followedStocks.length === 0

  // Get tutorial ID from current route
  const currentTutorialId = getTutorialIdFromRoute(location);

  // The active tutorial is either the forced one (from event) or the one for current route
  const activeTutorialId = forceTutorialId || currentTutorialId;

  // Listen for tutorial events (replay and first-follow trigger)
  useEffect(() => {
    const handleReplayTutorial = (event: Event) => {
      const customEvent = event as CustomEvent<{ tutorialId?: TutorialId }>;
      const requestedTutorialId = customEvent.detail?.tutorialId;

      // If a specific tutorial is requested, use that
      if (requestedTutorialId) {
        setForceTutorialId(requestedTutorialId);
        setManualTrigger(true);
      } else if (currentTutorialId) {
        // Otherwise, use the tutorial for the current route
        setForceTutorialId(null);
        setManualTrigger(true);
      }
    };

    const handleFirstFollow = (event: Event) => {
      const customEvent = event as CustomEvent;
      // Trigger first-follow tutorial only if not completed
      if (!isTutorialCompleted("first-follow")) {
        setForceTutorialId("first-follow");
        setManualTrigger(true);
      }
    };

    window.addEventListener('replay-tutorial', handleReplayTutorial);
    window.addEventListener('first-follow-tutorial', handleFirstFollow);
    return () => {
      window.removeEventListener('replay-tutorial', handleReplayTutorial);
      window.removeEventListener('first-follow-tutorial', handleFirstFollow);
    };
  }, [currentTutorialId, isTutorialCompleted]);

  // Contextual tutorial triggering based on user state and conditions
  useEffect(() => {
    // Don't auto-start while data is loading or hasn't been fetched yet
    if (progressLoading || experienceState === "loading" || !progressFetched || !user) return;
    if (experienceState !== "complete") return;
    if (forceTutorialId) return; // Don't interfere with forced tutorials
    
    // Tutorial 1: Opportunities intro - triggers after onboarding on recommendations page
    if (
      location === "/recommendations" &&
      !isTutorialCompleted("opportunities-intro")
    ) {
      setForceTutorialId("opportunities-intro");
      setManualTrigger(true);
      return;
    }

    // Tutorial 2: High signal follow prompt - triggers when high signal stock exists
    const hasHighSignalStock = stocks.some(stock => {
      const analysis = analyses.find((a: any) => a.ticker === stock.ticker);
      const score = analysis?.integratedScore ?? analysis?.aiScore;
      return score && score >= 90;
    });
    
    if (
      hasHighSignalStock &&
      location === "/recommendations" &&
      isTutorialCompleted("opportunities-intro") &&
      !isTutorialCompleted("high-signal-follow")
    ) {
      setForceTutorialId("high-signal-follow");
      setManualTrigger(true);
      return;
    }

    // Tutorial 3: First follow - triggers when user follows their first stock
    // This is event-driven from the follow action
    
  }, [
    location,
    user,
    experienceState,
    progressLoading,
    progressFetched,
    forceTutorialId,
    isTutorialCompleted,
    stocks,
    analyses,
  ]);

  // Don't render if no tutorial is available or if onboarding isn't complete (and not manual trigger)
  if (!activeTutorialId) {
    return null;
  }

  // Don't auto-start tutorials during onboarding (manual replays still work)
  if (experienceState === "onboarding_pending" && !forceTutorialId) {
    return null;
  }

  return (
    <Tutorial
      tutorialId={activeTutorialId}
      run={manualTrigger}
      onComplete={async () => {
        // Mark tutorial as completed
        if (activeTutorialId) {
          try {
            await completeTutorial(activeTutorialId);
          } catch (error) {
            console.error("Failed to mark tutorial as completed:", error);
            // Still close the tutorial even if saving completion fails
          }
        }
        setManualTrigger(false);
        setForceTutorialId(null);
      }}
    />
  );
}
