import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";
import { useUser } from "@/contexts/UserContext";
import { tutorials, TutorialId } from "@/config/tutorials";

interface TutorialProps {
  tutorialId: TutorialId;
  run?: boolean;
  onComplete?: () => void;
}

export function Tutorial({ tutorialId, run = false, onComplete }: TutorialProps) {
  const { user } = useUser();
  const [runTutorial, setRunTutorial] = useState(false);
  
  const tutorial = tutorials[tutorialId];

  // Handle tutorial completion
  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTutorial(false);
      
      if (onComplete) {
        onComplete();
      }
    }
  };

  // Start tutorial when run prop changes to true
  useEffect(() => {
    if (run && !runTutorial) {
      setRunTutorial(true);
    } else if (!run && runTutorial) {
      setRunTutorial(false);
    }
  }, [run, runTutorial]);

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
          primaryColor: "#0f766e",
          textColor: "#1e293b",
          backgroundColor: "#ffffff",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          arrowColor: "#ffffff",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "8px",
          backgroundColor: "#ffffff",
          color: "#1e293b",
          border: "1px solid #e2e8f0",
        },
        tooltipContent: {
          color: "#1e293b",
          padding: "16px",
        },
        tooltipTitle: {
          color: "#0f172a",
          fontSize: "18px",
          marginBottom: "8px",
          fontWeight: "600",
        },
        buttonNext: {
          backgroundColor: "#0f766e",
          color: "#ffffff",
          borderRadius: "8px",
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
          backgroundColor: "#f1f5f9",
          color: "#0f172a",
          borderRadius: "8px",
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
          color: "#64748b",
          minHeight: "44px",
          minWidth: "88px",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "500",
        },
        buttonClose: {
          color: "#64748b",
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
