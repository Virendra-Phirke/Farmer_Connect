import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { PageSkeleton } from "@/components/PageSkeleton";

const SsoCallback = () => (
  <div className="min-h-screen bg-background p-4 sm:p-6">
    <PageSkeleton type="list" />

    <AuthenticateWithRedirectCallback
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/auth-callback"
      signUpFallbackRedirectUrl="/auth-callback"
    />
  </div>
);

export default SsoCallback;
