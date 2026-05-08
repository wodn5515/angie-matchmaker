import { SurveysTabs } from "@/components/operator/surveys-tabs";

export default function SurveysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <SurveysTabs />
      {children}
    </div>
  );
}
