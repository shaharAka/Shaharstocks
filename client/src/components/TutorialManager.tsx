import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Tutorial } from "./tutorial";
import { getTutorialIdFromRoute, TutorialId } from "@/config/tutorials";

export function TutorialManager() {
  const [location] = useLocation();
  const [forceTutorialId, setForceTutorialId] = useState<TutorialId | null>(null);
  const [manualTrigger, setManualTrigger] = useState(false);
  const prevTutorialIdRef = useRef<TutorialId | null>(null);

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

  // Only reset when the current route's tutorial changes (not when forced tutorial is set)
  useEffect(() => {
    if (currentTutorialId !== prevTutorialIdRef.current && !forceTutorialId) {
      // Route's tutorial ID changed and we're not in forced mode, reset state
      setManualTrigger(false);
      prevTutorialIdRef.current = currentTutorialId;
    }
  }, [currentTutorialId, forceTutorialId]);

  // Don't render if no tutorial is available
  if (!activeTutorialId) {
    return null;
  }

  return (
    <Tutorial
      tutorialId={activeTutorialId}
      run={manualTrigger}
      onComplete={() => {
        setManualTrigger(false);
        setForceTutorialId(null);
      }}
    />
  );
}
