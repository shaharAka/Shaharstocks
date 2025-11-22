import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Tutorial } from "./tutorial";
import { getTutorialIdFromRoute, TutorialId } from "@/config/tutorials";
import { useUser } from "@/contexts/UserContext";

export function TutorialManager() {
  const [location] = useLocation();
  const [forceTutorialId, setForceTutorialId] = useState<TutorialId | null>(null);
  const [manualTrigger, setManualTrigger] = useState(false);
  const { experienceState, completeTutorial } = useUser();

  // Get tutorial ID from current route
  const currentTutorialId = getTutorialIdFromRoute(location);

  // The active tutorial is either the forced one (from event) or the one for current route
  const activeTutorialId = forceTutorialId || currentTutorialId;

  // Reset manual trigger on location change to prevent carryover between pages
  useEffect(() => {
    setManualTrigger(false);
    setForceTutorialId(null);
  }, [location]);

  // Listen for tutorial events (manual replay via help button only)
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
    return () => {
      window.removeEventListener('replay-tutorial', handleReplayTutorial);
    };
  }, [currentTutorialId]);

  // Don't render if no tutorial is available
  if (!activeTutorialId) {
    return null;
  }

  // Tutorial component only runs when manualTrigger is true (set by help button)
  // This prevents auto-triggering while still allowing manual triggers during onboarding
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
