import ChallengeClient from "@/components/challenge-client";

type ChallengePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { id } = await params;
  return <ChallengeClient challengeId={id} />;
}
