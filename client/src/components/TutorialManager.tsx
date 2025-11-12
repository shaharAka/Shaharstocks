import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Tutorial } from "./tutorial";
import { getTutorialIdFromRoute, TutorialId } from "@/config/tutorials";

export function TutorialManager() {
  const [location] = useLocation();
  const [forceTutorialId, setForceTutorialId] = useState<TutorialId | null>(null);
  const [runTutorial, setRunTutorial] = useState(false);

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
        setRunTutorial(true);
      } else if (currentTutorialId) {
        // Otherwise, use the tutorial for the current route
        setForceTutorialId(null);
        setRunTutorial(true);
      }
    };

    window.addEventListener('replay-tutorial', handleReplayTutorial);
    return () => window.removeEventListener('replay-tutorial', handleReplayTutorial);
  }, [currentTutorialId]);

  // Reset forced tutorial when route changes
  useEffect(() => {
    setForceTutorialId(null);
    setRunTutorial(false);
  }, [location]);

  // Don't render if no tutorial is available
  if (!activeTutorialId) {
    return null;
  }

  return (
    <Tutorial
      tutorialId={activeTutorialId}
      run={runTutorial}
      onComplete={() => {
        setRunTutorial(false);
        setForceTutorialId(null);
      }}
    />
  );
}
