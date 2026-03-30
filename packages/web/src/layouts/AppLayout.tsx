import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { OnboardingTour } from "@/components/feature/OnboardingTour";
import { FeedbackWidget } from "@/components/feature/FeedbackWidget";
import { ProcessStageGuide } from "@/components/feature/ProcessStageGuide";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 lg:p-6">
        <ProcessStageGuide />
        <Outlet />
      </main>
      <OnboardingTour />
      <FeedbackWidget />
    </div>
  );
}
