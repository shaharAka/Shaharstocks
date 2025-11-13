import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Tutorial } from "./tutorial";
import { getTutorialIdFromRoute, TutorialId } from "@/config/tutorials";
import { useUser } from "@/contexts/UserContext";

export function TutorialManager() {
  const [location] = useLocation();
  const [forceTutorialId, setForceTutorialId] = useState<TutorialId | null>(null);
  const [manualTrigger, setManualTrigger] = useState(false);
  const prevTutorialIdRef = useRef<TutorialId | null>(null);
  const { experienceState, isTutorialCompleted, completeTutorial, progressLoading } = useUser();

  // Get tutorial ID from current route
  const currentTutorialId = getTutorialIdFromRoute(location);

  // The active tutorial is either the forced one (from event) or the one for current route
  const activeTutorialId = forceTutorialId || currentTutorialId;

  // Listen for replay-tutorial events
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

    window.addEventListener('replay-tutorial', handleReplayTutorial);
    return () => window.removeEventListener('replay-tutorial', handleReplayTutorial);
  }, [currentTutorialId]);

  // Auto-start tutorial for first-time visitors (only after onboarding is complete)
  useEffect(() => {
    if (progressLoading) return;
    
    // Only auto-start if:
    // 1. Onboarding is complete
    // 2. There's a tutorial for this route
    // 3. This tutorial hasn't been completed yet
    // 4. We're not in forced mode (manual replay)
    const shouldAutoStart = 
      experienceState === "complete" &&
      currentTutorialId && 
      !isTutorialCompleted(currentTutorialId) &&
      !forceTutorialId;

    if (shouldAutoStart && currentTutorialId !== prevTutorialIdRef.current) {
      setManualTrigger(true);
      prevTutorialIdRef.current = currentTutorialId;
    } else if (currentTutorialId !== prevTutorialIdRef.current && !forceTutorialId) {
      // Route's tutorial ID changed and we're not in forced mode, reset state
      setManualTrigger(false);
      prevTutorialIdRef.current = currentTutorialId;
    }
  }, [currentTutorialId, forceTutorialId, experienceState, isTutorialCompleted, progressLoading]);

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
          await completeTutorial(activeTutorialId);
        }
        setManualTrigger(false);
        setForceTutorialId(null);
      }}
    />
  );
}
