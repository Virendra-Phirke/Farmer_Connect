import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { getUserRole, syncClerkUserToSupabase, UserRole } from "@/lib/supabase-auth";

export type AppRole = UserRole;

export const useUserRole = () => {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    const initializeUser = async () => {
      try {
        setError(null);

        // Sync Clerk user to Supabase profiles table
        await syncClerkUserToSupabase(user.id, {
          full_name: user.fullName || undefined,
          email: user.primaryEmailAddress?.emailAddress || undefined,
          avatar_url: user.imageUrl || undefined,
        });

        // Then fetch their role
        const userRole = await getUserRole(user.id);
        setRole(userRole);
      } catch (err: any) {
        console.error("Error initializing user:", err);
        setError(
          err.message ||
          "Cannot connect to database. Check your Supabase URL and API key."
        );
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, [user, isLoaded]);

  return { role, loading, isLoaded, user, error };
};
