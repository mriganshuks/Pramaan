import { Suspense } from "react";
import AuthOnboardingClient from "@/components/auth-onboarding-client";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[70vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
        </div>
      }
    >
      <AuthOnboardingClient initialMode="signup" />
    </Suspense>
  );
}
