type ClerkFieldError = {
  longMessage?: string;
  message?: string;
};

type ClerkErrorLike = {
  errors?: ClerkFieldError[];
  longMessage?: string;
  message?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Safely extracts a user-facing error from Clerk responses.
 */
export const getClerkErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) => {
  if (!isObject(error)) return fallback;

  const clerkError = error as ClerkErrorLike;
  const firstError = clerkError.errors?.[0];

  if (firstError?.longMessage) return firstError.longMessage;
  if (firstError?.message) return firstError.message;
  if (clerkError.longMessage) return clerkError.longMessage;
  if (typeof clerkError.message === "string" && clerkError.message.trim()) {
    return clerkError.message;
  }

  return fallback;
};
