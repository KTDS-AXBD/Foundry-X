import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { OnboardingTour } from "@/components/feature/OnboardingTour";
import { FeedbackWidget } from "@/components/feature/FeedbackWidget";
import { ProcessStageGuide } from "@/components/feature/ProcessStageGuide";
import { NpsSurveyTrigger } from "@/components/feature/NpsSurveyTrigger";
import { HelpAgentPanel } from "@/components/feature/HelpAgentPanel";
import { MarkerWidget } from "@/components/MarkerWidget";
import { useCallback, useState } from "react";

export function AppLayout() {
  const [npsSurveyId, setNpsSurveyId] = useState<string | undefined>();

  const handleNpsTrigger = useCallback((surveyId: string) => {
    setNpsSurveyId(surveyId);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 lg:p-6">
        <ProcessStageGuide />
        <Outlet />
      </main>
      <OnboardingTour />
      <FeedbackWidget surveyId={npsSurveyId} />
      <NpsSurveyTrigger onTrigger={handleNpsTrigger} />
      <HelpAgentPanel />
      <MarkerWidget />
    </div>
  );
}
