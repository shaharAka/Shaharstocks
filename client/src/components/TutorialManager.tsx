import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Tutorial } from "./tutorial";
import { getTutorialIdFromRoute, TutorialId } from "@/config/tutorials";
import { useUser } from "@/contexts/UserContext";

export function TutorialManager() {
  const [location] = useLocation();
  const [forceTutorialId, setForceTutorialId] = useState<TutorialId | null>(null);
  const [manualTrigger, setManualTrigger] = useState(false);
  const { experienceState, completeTutorial } = useUser();
  
  // Track pending intro tour request (survives state transitions)
  const pendingIntroTour = useRef(false);

  // Get tutorial ID from current route
  const currentTutorialId = getTutorialIdFromRoute(location);

  // The active tutorial is either the forced one (from event) or the one for current route
  const activeTutorialId = forceTutorialId || currentTutorialId;

  // Reset manual trigger on location change to prevent carryover between pages
  // BUT: don't reset if we're running the ui-intro (it persists across navigation)
  useEffect(() => {
    if (forceTutorialId !== "ui-intro") {
      setManualTrigger(false);
      setForceTutorialId(null);
    }
  }, [location, forceTutorialId]);

  // Listen for tutorial events (manual replay via help button or post-onboarding intro)
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

    // Listen for post-onboarding intro tour
    const handleStartIntroTour = () => {
      // Mark that we want to start the intro tour
      pendingIntroTour.current = true;
    };

    window.addEventListener('replay-tutorial', handleReplayTutorial);
    window.addEventListener('start-intro-tour', handleStartIntroTour);
    return () => {
      window.removeEventListener('replay-tutorial', handleReplayTutorial);
      window.removeEventListener('start-intro-tour', handleStartIntroTour);
    };
  }, [currentTutorialId]);

  // Start intro tour when experienceState transitions to "complete" and we have a pending request
  useEffect(() => {
    if (pendingIntroTour.current && experienceState === "complete") {
      pendingIntroTour.current = false;
      // Small delay to ensure UI elements are visible after onboarding dialog closes
      setTimeout(() => {
        setForceTutorialId("ui-intro");
        setManualTrigger(true);
      }, 500);
    }
  }, [experienceState]);

  // Don't render tutorials during onboarding or loading, or if no tutorial available
  if (!activeTutorialId || experienceState === "onboarding_pending" || experienceState === "loading") {
    return null;
  }

  // Tutorial component only runs when manualTrigger is true (set by help button)
  // This prevents auto-triggering and ensures onboarding completes first
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
