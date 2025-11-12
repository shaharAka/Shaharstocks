import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useUser } from "@/contexts/UserContext";
import { tutorials, TutorialId } from "@/config/tutorials";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TutorialProps {
  tutorialId: TutorialId;
  run?: boolean;
  onComplete?: () => void;
}

export function Tutorial({ tutorialId, run = false, onComplete }: TutorialProps) {
  const { user } = useUser();
  const [runTutorial, setRunTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  
  const tutorial = tutorials[tutorialId];

  // Check if user has completed this tutorial
  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/tutorials/${tutorialId}/status`);
        const data = await response.json();
        setHasSeenTutorial(data.completed);
        
        // Auto-start tutorial if user hasn't seen it (first visit)
        if (!data.completed) {
          setRunTutorial(true);
        }
      } catch (error) {
        console.error("Failed to check tutorial status:", error);
      }
    };

    checkTutorialStatus();
  }, [user, tutorialId]);

  // Handle tutorial completion
  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) && user) {
      try {
        // Mark tutorial as completed (uses session for user ID)
        await apiRequest("POST", `/api/tutorials/${tutorialId}/complete`, {});
        
        setHasSeenTutorial(true);
        setRunTutorial(false);
        
        // Invalidate queries to refresh tutorial status
        queryClient.invalidateQueries({ queryKey: ["/api/tutorials", tutorialId, "status"] });
        
        if (onComplete) {
          onComplete();
        }
      } catch (error) {
        console.error("Failed to mark tutorial as completed:", error);
      }
    }
  };

  // Manually start tutorial (from help button or replay event)
  useEffect(() => {
    if (run && !runTutorial) {
      setRunTutorial(true);
    }
  }, [run]);

  // Listen for replay-tutorial event
  useEffect(() => {
    const handleReplay = () => {
      setRunTutorial(true);
    };

    window.addEventListener('replay-tutorial', handleReplay);
    return () => window.removeEventListener('replay-tutorial', handleReplay);
  }, []);

  if (!user || !tutorial) return null;

  return (
    <Joyride
      steps={tutorial.steps}
      run={runTutorial}
      continuous
      showProgress
      showSkipButton
      spotlightClicks={true}
      disableOverlayClose={false}
      disableScrolling={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          arrowColor: "hsl(var(--card))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "var(--radius)",
          backgroundColor: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
        },
        tooltipContent: {
          color: "hsl(var(--card-foreground))",
          padding: "16px",
        },
        tooltipTitle: {
          color: "hsl(var(--card-foreground))",
          fontSize: "18px",
          marginBottom: "8px",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "var(--radius)",
          padding: "12px 24px",
          minHeight: "44px",
          minWidth: "88px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          fontSize: "14px",
          fontWeight: "500",
        },
        buttonBack: {
          backgroundColor: "hsl(var(--secondary))",
          color: "hsl(var(--secondary-foreground))",
          borderRadius: "var(--radius)",
          marginRight: "8px",
          minHeight: "44px",
          minWidth: "88px",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          fontSize: "14px",
          fontWeight: "500",
        },
        buttonSkip: {
          backgroundColor: "transparent",
          color: "hsl(var(--muted-foreground))",
          minHeight: "44px",
          minWidth: "88px",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid hsl(var(--border))",
          borderRadius: "var(--radius)",
          fontSize: "14px",
          fontWeight: "500",
        },
        buttonClose: {
          color: "hsl(var(--muted-foreground))",
          minHeight: "44px",
          minWidth: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}
