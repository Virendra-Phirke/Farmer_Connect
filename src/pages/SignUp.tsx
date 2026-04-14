import { useSignUp, useUser } from "@clerk/clerk-react";
import { ArrowLeft, Loader2, Mail, UserRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getClerkErrorMessage } from "@/lib/clerk-errors";
import { GoogleOneTap } from "@clerk/clerk-react";

const OTP_LENGTH = 6;

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.6 2.8-4 2.8-6.8 0-.7-.1-1.4-.2-2H12z"
    />
    <path
      fill="#4285F4"
      d="M12 22c2.6 0 4.8-.9 6.5-2.4l-3.1-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1l-3.2 2.5C4.9 19.7 8.2 22 12 22z"
    />
    <path
      fill="#FBBC05"
      d="M6.4 14c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2L3.2 7.5C2.4 9 2 10.5 2 12s.4 3 1.2 4.5L6.4 14z"
    />
    <path
      fill="#34A853"
      d="M12 5.9c1.4 0 2.7.5 3.7 1.5l2.8-2.8C16.8 3 14.6 2 12 2 8.2 2 4.9 4.3 3.2 7.5L6.4 10c.8-2.3 3-4.1 5.6-4.1z"
    />
  </svg>
);

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const createAccountAndSendOtp = async () => {
    if (!isLoaded || !signUp || !setActive) return;

    if (!normalizedEmail || !firstName.trim() || !lastName.trim()) {
      setErrorMessage("First name, last name, and email are required.");
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setSendingOtp(true);

    try {
      const signUpAttempt = await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: normalizedEmail,
      });

      if (signUpAttempt.status === "complete" && signUpAttempt.createdSessionId) {
        await setActive({ session: signUpAttempt.createdSessionId, redirectUrl: "/auth-callback" });
        return;
      }

      await signUpAttempt.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
      setOtp("");
      setNoticeMessage(`We sent a 6-digit OTP to ${normalizedEmail}.`);
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error, "Unable to start sign-up. Please try again."));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSignUpSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createAccountAndSendOtp();
  };

  const handleResendOtp = async () => {
    if (!isLoaded || !signUp) return;

    setErrorMessage(null);
    setNoticeMessage(null);
    setSendingOtp(true);

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setOtp("");
      setNoticeMessage(`A new OTP has been sent to ${normalizedEmail}.`);
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error, "Unable to resend OTP. Please try again."));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoaded || !signUp || !setActive) return;

    const code = otp.trim();
    if (code.length !== OTP_LENGTH) {
      setErrorMessage("Enter the 6-digit OTP sent to your email.");
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setVerifyingOtp(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      if (completeSignUp.status === "complete" && completeSignUp.createdSessionId) {
        await setActive({ session: completeSignUp.createdSessionId, redirectUrl: "/auth-callback" });
        return;
      }

      setErrorMessage("OTP was verified, but account setup is incomplete. Please retry sign-up.");
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error, "OTP verification failed. Please try again."));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded || !signUp) return;

    setErrorMessage(null);
    setNoticeMessage(null);
    setGoogleLoading(true);

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}/auth-callback`,
      });
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error, "Google sign-up failed. Please try again."));
      setGoogleLoading(false);
    }
  };

  if (userLoaded && isSignedIn) {
    return <Navigate to="/auth-callback" replace />;
  }

  return (
    <AuthShell
      title="Create Account"
      subtitle="Sign up with Google or verify your email using OTP."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/sign-in" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleOneTap />
        {errorMessage && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {noticeMessage && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {noticeMessage}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!isLoaded || googleLoading || sendingOtp || verifyingOtp}
          onClick={handleGoogleSignUp}
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">
            or email OTP
          </span>
        </div>

        {!pendingVerification ? (
          <form className="space-y-4" onSubmit={handleSignUpSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Vikas"
                    className="pl-10"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    disabled={!isLoaded || sendingOtp || verifyingOtp || googleLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Patil"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={!isLoaded || sendingOtp || verifyingOtp || googleLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={!isLoaded || sendingOtp || verifyingOtp || googleLoading}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!isLoaded || sendingOtp || verifyingOtp || googleLoading}
            >
              {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sendingOtp ? "Sending OTP..." : "Create Account & Send OTP"}
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div className="space-y-2">
              <Label htmlFor="otp">Email OTP</Label>
              <InputOTP
                id="otp"
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                disabled={verifyingOtp || sendingOtp || googleLoading}
                containerClassName="w-full justify-center"
              >
                <InputOTPGroup className="gap-1.5">
                  {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} className="h-11 w-11 rounded-md border border-input" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={verifyingOtp || sendingOtp || googleLoading || otp.trim().length !== OTP_LENGTH}
            >
              {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {verifyingOtp ? "Verifying..." : "Verify OTP & Complete Sign Up"}
            </Button>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPendingVerification(false);
                  setOtp("");
                  setNoticeMessage(null);
                  setErrorMessage(null);
                }}
                disabled={verifyingOtp || sendingOtp}
              >
                <ArrowLeft className="h-4 w-4" />
                Edit details
              </Button>

              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0"
                onClick={() => void handleResendOtp()}
                disabled={sendingOtp || verifyingOtp || googleLoading}
              >
                {sendingOtp ? "Sending..." : "Resend OTP"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  );
};

export default SignUp;
