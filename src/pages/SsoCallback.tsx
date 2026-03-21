import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

const SsoCallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4">
    <div className="max-w-sm w-full rounded-xl border border-border bg-card p-6 text-center shadow-lg">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
      <h1 className="font-display text-xl font-bold text-foreground">Completing Sign In</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Please wait while we securely finish your Google authentication.
      </p>
    </div>

    <AuthenticateWithRedirectCallback
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/auth-callback"
      signUpFallbackRedirectUrl="/auth-callback"
    />
  </div>
);

export default SsoCallback;
