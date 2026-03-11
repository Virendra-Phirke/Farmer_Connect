import { SignIn as ClerkSignIn } from "@clerk/clerk-react";
import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";

const SignIn = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
    <Link to="/" className="flex items-center gap-2 mb-8">
      <Sprout className="h-8 w-8 text-primary" />
      <span className="font-display text-2xl font-bold text-foreground">Farmer's Connect</span>
    </Link>
    <ClerkSignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/auth-callback"
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg border border-border rounded-xl",
        },
      }}
    />
  </div>
);

export default SignIn;
