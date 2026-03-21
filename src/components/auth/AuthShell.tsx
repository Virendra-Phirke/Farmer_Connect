import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Leaf, ShieldCheck, Sprout, Tractor } from "lucide-react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

const highlights = [
  {
    title: "Fresh Farm Network",
    description: "Direct access to farmers, buyers, and equipment owners.",
    icon: Leaf,
  },
  {
    title: "Trusted Access",
    description: "Secure OTP and OAuth based sign-in handled by Clerk.",
    icon: ShieldCheck,
  },
  {
    title: "Role-Based Dashboards",
    description: "Farmer, Hotel/Restaurant, and Equipment workflows in one place.",
    icon: Tractor,
  },
];

const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => (
  <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--secondary)/0.22),_transparent_52%),linear-gradient(135deg,_hsl(var(--background)),_hsl(var(--cream)))]">
    <div className="pointer-events-none absolute -left-28 top-12 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
    <div className="pointer-events-none absolute -right-20 bottom-4 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

    <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 md:px-8">
      <section className="hidden w-1/2 pr-10 lg:block">
        <Link to="/" className="inline-flex items-center gap-3 rounded-xl bg-background/60 px-4 py-2 backdrop-blur">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Sprout className="h-5 w-5 text-primary" />
          </span>
          <span className="font-display text-2xl font-bold text-foreground">Farmer's Connect</span>
        </Link>

        <div className="mt-10">
          <h1 className="max-w-lg text-4xl font-bold leading-tight text-foreground">
            Market-first platform for India’s farm-to-business supply chain.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Sign in to manage contracts, logistics, equipment rentals, and real-time farmer
            collaboration.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-xl border border-border/80 bg-card/70 p-4 backdrop-blur-sm"
            >
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-4 w-4 text-primary" />
              </span>
              <div>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-md rounded-3xl border border-border/80 bg-card/90 p-6 shadow-2xl backdrop-blur md:p-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Secure Access</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {children}

        <div className="mt-8 border-t border-border/70 pt-4 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      </section>
    </div>
  </div>
);

export default AuthShell;
