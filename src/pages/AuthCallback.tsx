import { useUser } from "@clerk/clerk-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { PageSkeleton } from "@/components/PageSkeleton";

/**
 * After auth, checks if user has a role:
 * - No role → /select-role
 * - Has role → redirect to correct dashboard
 * - Error → show error message
 */
const AuthCallback = () => {
  const { isLoaded, user } = useUser();
  const { role, loading, error } = useUserRole();

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <PageSkeleton type="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center bg-card p-8 rounded-xl border border-border">
          <h2 className="font-display text-xl font-bold text-destructive mb-4">
            Database Connection Error
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">
            Please verify your <strong>VITE_SUPABASE_URL</strong> and{" "}
            <strong>VITE_SUPABASE_ANON_KEY</strong> in the{" "}
            <code className="bg-muted px-1 py-0.5 rounded">.env</code> file,
            and make sure your Supabase project is active (not paused).
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!role) {
    return <Navigate to="/select-role" replace />;
  }

  if (role === "farmer") return <Navigate to="/farmer-dashboard" replace />;
  if (role === "hotel_restaurant_manager")
    return <Navigate to="/hotel-dashboard" replace />;
  if (role === "equipment_owner")
    return <Navigate to="/equipment-dashboard" replace />;
  if (role === "chain_connector")
    return <Navigate to="/chain-connector-dashboard" replace />;

  return <Navigate to="/select-role" replace />;
};

export default AuthCallback;
