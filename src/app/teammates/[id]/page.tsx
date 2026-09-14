import CandidateProfileClient from "@/components/candidate-profile-client";

type CandidatePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CandidatePage({ params, searchParams }: CandidatePageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const teamId = typeof resolvedSearchParams.team === "string" ? resolvedSearchParams.team : undefined;
  return <CandidateProfileClient candidateId={id} teamId={teamId} />;
}
