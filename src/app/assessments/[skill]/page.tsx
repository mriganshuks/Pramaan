import AssessmentClient from "@/components/assessment-client";

type AssessmentPageProps = {
  params: Promise<{ skill: string }>;
  searchParams: Promise<{ difficulty?: string }>;
};

export default async function AssessmentPage({ params, searchParams }: AssessmentPageProps) {
  const { skill } = await params;
  const { difficulty } = await searchParams;
  const level = difficulty === "beginner" || difficulty === "advanced" ? difficulty : "intermediate";

  return <AssessmentClient skill={decodeURIComponent(skill)} difficulty={level} />;
}
