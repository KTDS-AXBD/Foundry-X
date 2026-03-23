import { Sidebar } from "@/components/sidebar";
import { OnboardingTour } from "@/components/feature/OnboardingTour";
import { FeedbackWidget } from "@/components/feature/FeedbackWidget";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      <OnboardingTour />
      <FeedbackWidget />
    </div>
  );
}
