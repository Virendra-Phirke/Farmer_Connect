import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout, UtensilsCrossed, Tractor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { setUserRole, syncClerkUserToSupabase, UserRole } from "@/lib/supabase-auth";

const roles = [
  {
    value: "farmer",
    label: "Farmer",
    icon: Sprout,
    description:
      "I grow crops and want to sell directly, rent or buy equipment, get crop guidance, and connect with groups.",
  },
  {
    value: "hotel_restaurant_manager",
    label: "Hotel / Restaurant",
    icon: UtensilsCrossed,
    description:
      "I manage a hotel or restaurant and want to buy fresh produce directly from farmers in bulk.",
  },
  {
    value: "equipment_owner",
    label: "Equipment Owner",
    icon: Tractor,
    description:
      "I own agricultural equipment and want to rent it out to farmers.",
  },
];

const SelectRole = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selected || !user) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      // Step 1: Sync user profile to Supabase
      await syncClerkUserToSupabase(user.id, {
        full_name: user.fullName || undefined,
        email: user.primaryEmailAddress?.emailAddress || undefined,
        avatar_url: user.imageUrl || undefined,
      });

      // Step 2: Set role in Supabase
      await setUserRole(user.id, selected as UserRole);

      toast.success("Welcome aboard! Redirecting to your dashboard...");

      // Step 3: Redirect based on role
      if (selected === "farmer") navigate("/farmer-dashboard");
      else if (selected === "hotel_restaurant_manager") navigate("/hotel-dashboard");
      else if (selected === "equipment_owner") navigate("/equipment-dashboard");
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <Tractor className="h-10 w-10 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Choose Your Role
          </h1>
          <p className="text-muted-foreground">
            Tell us how you'd like to use Farmer's Connect
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
            <p className="text-sm text-destructive font-medium">{errorMsg}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Check your <strong>.env</strong> file — make sure VITE_SUPABASE_URL
              and VITE_SUPABASE_ANON_KEY point to an active Supabase project.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => (
            <button
              key={role.value}
              onClick={() => setSelected(role.value)}
              className={`p-8 rounded-xl border-2 text-left transition-all duration-200 ${selected === role.value
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                }`}
            >
              <div
                className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-colors ${selected === role.value ? "bg-primary/20" : "bg-primary/10"
                  }`}
              >
                <role.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {role.label}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {role.description}
              </p>
            </button>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            disabled={!selected || submitting}
            onClick={handleSubmit}
            className="min-w-[200px]"
          >
            {submitting ? "Setting up..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectRole;
