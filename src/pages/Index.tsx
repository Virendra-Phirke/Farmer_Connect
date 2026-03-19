import { useEffect, useRef, useState } from "react";
import {
    Sprout, Tractor, Store, CloudSun, Users, ArrowRight,
    Moon, Sun, Leaf, BarChart3, Wifi, Shield, ChevronDown,
    MapPin, Zap, Globe, Star, TrendingUp, Droplets, Wind,
    Menu, X, CheckCircle2, Award, Cpu
} from "lucide-react";
import heroImage from "@/assets/hero-farm.jpg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useTheme } from "@/hooks/useTheme";

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target: number, duration = 1800, start = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(ease * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [start, target, duration]);
    return count;
}

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, inView };
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
    const { isDark, toggleTheme } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handler);
        return () => window.removeEventListener("scroll", handler);
    }, []);

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-background/95 border-b border-border shadow-sm" : "bg-transparent"}`}>
                <div className="container mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
                    {/* Logo */}
                    <a href="#" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm group-hover:bg-emerald-700 transition-colors">
                            <Sprout className="h-4.5 w-4.5 text-white" />
                        </div>
                        <span className="font-bold text-[17px] tracking-tight text-white dark:text-white" style={{ textShadow: scrolled ? "none" : "0 1px 4px rgba(0,0,0,0.5)" }}>
                            <span className={scrolled ? "text-foreground" : "text-white"}>Farmer's</span>
                            <span className="text-emerald-400">Connect</span>
                        </span>
                    </a>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-6">
                        {["Services", "How It Works", "About"].map(item => (
                            <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                                className={`text-[13px] font-medium transition-colors relative group ${scrolled ? "text-muted-foreground hover:text-foreground" : "text-white/85 hover:text-white"}`}>
                                {item}
                                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-300" />
                            </a>
                        ))}
                    </div>

                    {/* Right actions */}
                    <div className="hidden md:flex items-center gap-2">
                        <button onClick={toggleTheme} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${scrolled ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-white/80 hover:text-white hover:bg-white/10"}`}>
                            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </button>
                        <SignedOut>
                            <Link to="/sign-in">
                                <Button size="sm" variant="ghost" className={`text-[13px] ${scrolled ? "" : "text-white hover:text-white hover:bg-white/10"}`}>Sign In</Button>
                            </Link>
                            <Link to="/sign-up">
                                <Button size="sm" className="text-[13px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">
                                    Get Started <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <Link to="/auth-callback"><Button size="sm" variant="outline" className="text-[13px]">Dashboard</Button></Link>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                    </div>

                    {/* Mobile menu toggle */}
                    <div className="flex md:hidden items-center gap-2">
                        <button onClick={toggleTheme} className={`w-8 h-8 rounded-lg flex items-center justify-center ${scrolled ? "text-muted-foreground hover:bg-muted" : "text-white hover:bg-white/10"}`}>
                            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setMobileOpen(v => !v)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${scrolled ? "text-muted-foreground hover:bg-muted" : "text-white hover:bg-white/10"}`}>
                            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute top-16 left-0 right-0 bg-background border-b border-border shadow-xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
                        {["services", "how-it-works", "about"].map(id => (
                            <a key={id} href={`#${id}`} onClick={() => setMobileOpen(false)}
                                className="block text-sm font-medium text-foreground py-2 border-b border-border/50 capitalize">
                                {id.replace(/-/g, " ")}
                            </a>
                        ))}
                        <div className="flex gap-2 pt-2">
                            <SignedOut>
                                <Link to="/sign-in" className="flex-1"><Button size="sm" variant="outline" className="w-full">Sign In</Button></Link>
                                <Link to="/sign-up" className="flex-1"><Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Get Started</Button></Link>
                            </SignedOut>
                            <SignedIn>
                                <Link to="/auth-callback" className="flex-1"><Button size="sm" variant="outline" className="w-full">Dashboard</Button></Link>
                                <UserButton afterSignOutUrl="/" />
                            </SignedIn>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
const Hero = () => {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
            {/* Background image */}
            <div className="absolute inset-0">
                <img src={heroImage} alt="Farm" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 dark:from-black/80 dark:via-black/60 dark:to-black/90" />
                {/* Tech grid overlay */}
                <div className="absolute inset-0 opacity-[0.07]"
                    style={{ backgroundImage: "linear-gradient(rgba(52,211,153,1) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,1) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
                {/* Radial glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(16,185,129,0.12),transparent)]" />
            </div>

            {/* Hero content */}
            <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center max-w-5xl">
                {/* Badge */}
                <div className={`inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-full px-4 py-1.5 mb-8 transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 text-xs font-semibold tracking-wide uppercase">AI-Powered AgriTech Platform</span>
                </div>

                {/* Headline */}
                <h1 className={`text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6 transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                    style={{ transitionDelay: "150ms" }}>
                    Grow Together,
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
                        Profit Together
                    </span>
                </h1>

                {/* Subheadline */}
                <p className={`text-base sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                    style={{ transitionDelay: "300ms" }}>
                    Connecting farmers to <span className="text-white font-medium">AI guidance</span>, equipment, and direct markets —
                    eliminating middlemen and maximizing your profits with minimum resources.
                </p>

                {/* CTA buttons */}
                <div className={`flex flex-col sm:flex-row gap-3 justify-center mb-16 transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                    style={{ transitionDelay: "450ms" }}>
                    <Link to="/sign-up">
                        <button className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl shadow-lg shadow-emerald-900/40 hover:shadow-emerald-600/30 transition-all duration-300 hover:scale-[1.02]">
                            Start for Free
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </Link>
                    <a href="#how-it-works">
                        <button className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl border border-white/30 transition-all duration-300">
                            See How It Works
                        </button>
                    </a>
                </div>

                {/* Scroll indicator */}
                <div className={`flex flex-col items-center gap-2 transition-all duration-700 ${loaded ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "700ms" }}>
                    <span className="text-white/60 text-xs font-medium tracking-widest uppercase">Scroll to explore</span>
                    <ChevronDown className="w-4 h-4 text-white/60 animate-bounce" />
                </div>
            </div>

            {/* Floating stats bar */}
            <div className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "900ms" }}>
                <div className="bg-black/60 border-t border-white/10">
                    <div className="container mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 sm:divide-x sm:divide-white/10">
                        {[
                            { icon: <Users className="w-4 h-4 text-emerald-400" />, value: "50,000+", label: "Farmers" },
                            { icon: <MapPin className="w-4 h-4 text-amber-400" />, value: "340+", label: "Districts" },
                            { icon: <TrendingUp className="w-4 h-4 text-sky-400" />, value: "₹2.4Cr", label: "Saved in middlemen" },
                            { icon: <Star className="w-4 h-4 text-yellow-400" />, value: "4.9 ★", label: "Farmer rating" },
                        ].map((stat, i) => (
                            <div key={i} className="flex items-center gap-3 sm:justify-center sm:px-6">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">{stat.icon}</div>
                                <div>
                                    <p className="text-white font-bold text-[15px] leading-tight">{stat.value}</p>
                                    <p className="text-white/60 text-[11px]">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Services ─────────────────────────────────────────────────────────────────
const services = [
    {
        icon: Sprout, color: "emerald", glow: "shadow-emerald-500/20",
        badge: "AI-Powered",
        title: "Smart Crop Guidance",
        description: "Get soil-specific crop recommendations, seed selection, and fertilizer planning tailored to your land using AI models trained on Indian soil data.",
        features: ["Soil-type analysis", "Seasonal planning", "Fertilizer calculator"],
    },
    {
        icon: Tractor, color: "amber", glow: "shadow-amber-500/20",
        badge: "Community",
        title: "Equipment Rental",
        description: "Rent agricultural equipment from nearby farmers or list your own machinery for others to use — a community-powered tool marketplace.",
        features: ["Geo-based search", "Secure booking", "Earn from idle equipment"],
    },
    {
        icon: Store, color: "sky", glow: "shadow-sky-500/20",
        badge: "Direct Access",
        title: "Direct Marketing",
        description: "Sell your produce directly to restaurants and consumers — no middlemen, no commission, maximum profit straight to your hands.",
        features: ["Restaurant network", "Fair pricing", "Instant payments"],
    },
    {
        icon: CloudSun, color: "violet", glow: "shadow-violet-500/20",
        badge: "Real-Time",
        title: "Weather Intelligence",
        description: "Hyper-local weather forecasts, rain alerts, frost warnings, and humidity tracking to plan every farming activity with precision.",
        features: ["7-day forecasts", "SMS alerts", "Crop impact scores"],
    },
];

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string; dot: string }> = {
    emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/60", badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
    amber:   { bg: "bg-amber-100 dark:bg-amber-900/30",   text: "text-amber-600 dark:text-amber-400",   border: "border-amber-200 dark:border-amber-800/60",   badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",   dot: "bg-amber-500" },
    sky:     { bg: "bg-sky-100 dark:bg-sky-900/30",       text: "text-sky-600 dark:text-sky-400",       border: "border-sky-200 dark:border-sky-800/60",       badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",       dot: "bg-sky-500" },
    violet:  { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800/60", badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
};

const Services = () => {
    const { ref, inView } = useInView();
    return (
        <section id="services" className="py-24 sm:py-32 bg-background relative overflow-hidden">
            {/* Subtle background texture */}
            <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
                style={{ backgroundImage: "radial-gradient(circle,#10b981 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

            <div ref={ref} className="container mx-auto px-4 sm:px-6 relative">
                {/* Section header */}
                <div className={`text-center mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full px-3.5 py-1.5 mb-4 border border-emerald-200 dark:border-emerald-800/60">
                        <Zap className="w-3 h-3" /> What We Offer
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
                        Everything You Need<br className="hidden sm:block" />
                        <span className="text-emerald-600 dark:text-emerald-500"> to Thrive</span>
                    </h2>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
                        From AI crop guidance to direct market access — one platform, complete farming solutions.
                    </p>
                </div>

                {/* Service cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {services.map((svc, i) => {
                        const c = colorMap[svc.color];
                        return (
                            <div key={svc.title}
                                className={`group relative bg-card border ${c.border} rounded-2xl p-6 hover:shadow-xl ${svc.glow} transition-all duration-400 hover:-translate-y-1 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                                style={{ transitionDelay: `${i * 100}ms` }}>
                                {/* Badge */}
                                <span className={`inline-block text-[10px] font-bold rounded-full px-2.5 py-0.5 mb-4 border ${c.badge} border-transparent`}>{svc.badge}</span>

                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <svc.icon className={`w-6 h-6 ${c.text}`} />
                                </div>

                                <h3 className="font-bold text-[15px] text-foreground mb-2 leading-tight">{svc.title}</h3>
                                <p className="text-muted-foreground text-[13px] leading-relaxed mb-4">{svc.description}</p>

                                {/* Feature list */}
                                <ul className="space-y-1.5">
                                    {svc.features.map(f => (
                                        <li key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                            <div className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                {/* Hover glow accent */}
                                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none`}
                                    style={{ background: `radial-gradient(circle at 50% 0%, ${svc.color === "emerald" ? "rgba(16,185,129,0.06)" : svc.color === "amber" ? "rgba(245,158,11,0.06)" : svc.color === "sky" ? "rgba(14,165,233,0.06)" : "rgba(139,92,246,0.06)"}, transparent 70%)` }} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// ─── Tech feature strip ───────────────────────────────────────────────────────
const TechStrip = () => {
    const { ref, inView } = useInView();
    const items = [
        { icon: <Cpu className="w-5 h-5" />, label: "AI Recommendations" },
        { icon: <Shield className="w-5 h-5" />, label: "Encrypted Data" },
        { icon: <Wifi className="w-5 h-5" />, label: "Real-time Sync" },
        { icon: <Globe className="w-5 h-5" />, label: "Multi-language" },
        { icon: <Droplets className="w-5 h-5" />, label: "Soil Monitoring" },
        { icon: <Wind className="w-5 h-5" />, label: "Weather API" },
        { icon: <BarChart3 className="w-5 h-5" />, label: "Yield Analytics" },
        { icon: <Leaf className="w-5 h-5" />, label: "Organic Guidance" },
    ];

    return (
        <div ref={ref} className={`py-12 bg-emerald-950 dark:bg-emerald-950 border-y border-emerald-900 overflow-hidden transition-all duration-700 ${inView ? "opacity-100" : "opacity-0"}`}>
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-emerald-400/70 hover:text-emerald-300 transition-colors cursor-default"
                            style={{ transitionDelay: `${i * 50}ms` }}>
                            {item.icon}
                            <span className="text-[13px] font-semibold tracking-wide whitespace-nowrap">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── How It Works ─────────────────────────────────────────────────────────────
const steps = [
    {
        number: "01", icon: <Users className="w-5 h-5" />, color: "emerald",
        title: "Join & Connect",
        description: "Register in minutes. Get grouped with farmers in your district based on soil type and location for peer learning.",
    },
    {
        number: "02", icon: <Cpu className="w-5 h-5" />, color: "sky",
        title: "Get AI Guidance",
        description: "Our AI analyzes your soil, location, and season to give you personalized crop, seed, and fertilizer recommendations.",
    },
    {
        number: "03", icon: <Tractor className="w-5 h-5" />, color: "amber",
        title: "Grow & Rent",
        description: "Farm confidently. Rent equipment from nearby farmers when you need it, and list yours to earn passive income.",
    },
    {
        number: "04", icon: <Store className="w-5 h-5" />, color: "violet",
        title: "Sell Direct",
        description: "Connect directly with restaurants, consumers, and aggregators. Receive fair prices, no middleman, full transparency.",
    },
];

const HowItWorks = () => {
    const { ref, inView } = useInView();
    return (
        <section id="how-it-works" className="py-24 sm:py-32 bg-muted/30 dark:bg-zinc-950/50 relative overflow-hidden">
            {/* Decorative arc */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div ref={ref} className="container mx-auto px-4 sm:px-6 relative">
                {/* Header */}
                <div className={`text-center mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    <div className="inline-flex items-center gap-2 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-bold rounded-full px-3.5 py-1.5 mb-4 border border-sky-200 dark:border-sky-800/60">
                        <Leaf className="w-3 h-3" /> Simple Process
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">How It Works</h2>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
                        Four simple steps from registration to earning more from your land.
                    </p>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                    {/* Connection line */}
                    <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none" />

                    {steps.map((step, i) => {
                        const c = colorMap[step.color];
                        return (
                            <div key={step.number}
                                className={`relative bg-card border border-border rounded-2xl p-6 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all duration-400 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                                style={{ transitionDelay: `${i * 120}ms` }}>
                                {/* Step number + icon */}
                                <div className="flex items-center justify-between mb-5">
                                    <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center`}>
                                        {step.icon}
                                    </div>
                                    <span className="text-5xl font-bold text-zinc-200 dark:text-zinc-700 leading-none select-none">{step.number}</span>
                                </div>
                                <h3 className="font-bold text-[15px] text-foreground mb-2">{step.title}</h3>
                                <p className="text-muted-foreground text-[13px] leading-relaxed">{step.description}</p>

                                {/* Connector arrow (desktop) */}
                                {i < steps.length - 1 && (
                                    <div className="hidden lg:flex absolute -right-4 top-10 z-10 w-8 h-8 items-center justify-center">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center">
                                            <ArrowRight className="w-3 h-3 text-emerald-600" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// ─── Stats section ────────────────────────────────────────────────────────────
const statsData = [
    { value: 50000, suffix: "+", label: "Active Farmers", icon: <Users className="w-5 h-5" /> },
    { value: 340,   suffix: "+", label: "Districts Covered", icon: <MapPin className="w-5 h-5" /> },
    { value: 34,    suffix: "%", label: "Avg. Profit Increase", icon: <TrendingUp className="w-5 h-5" /> },
    { value: 240,   suffix: "M+", label: "Saved in Middlemen (₹)", icon: <Award className="w-5 h-5" /> },
];

const Stats = () => {
    const { ref, inView } = useInView();
    const [started, setStarted] = useState(false);
    useEffect(() => { if (inView) setStarted(true); }, [inView]);

    const c0 = useCounter(statsData[0].value, 2000, started);
    const c1 = useCounter(statsData[1].value, 1600, started);
    const c2 = useCounter(statsData[2].value, 1400, started);
    const c3 = useCounter(statsData[3].value, 2200, started);
    const counts = [c0, c1, c2, c3];

    return (
        <section className="py-20 bg-emerald-700 dark:bg-sky-900/40 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl" />

            <div ref={ref} className="container mx-auto px-4 sm:px-6 relative">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2">Real Impact, Real Numbers</h2>
                    <p className="text-white/80 text-sm sm:text-base">Growing every day with thousands of farmers across India</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                    {statsData.map((stat, i) => (
                        <div key={i} className={`text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                            style={{ transitionDelay: `${i * 100}ms` }}>
                            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-4 text-white">
                                {stat.icon}
                            </div>
                            <p className="text-3xl sm:text-4xl font-bold text-white mb-1">
                                {counts[i].toLocaleString()}{stat.suffix}
                            </p>
                            <p className="text-white/80 text-[13px] font-medium">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── About ────────────────────────────────────────────────────────────────────
const About = () => {
    const { ref, inView } = useInView();
    const pillars = [
        { icon: <Leaf className="w-4 h-4 text-emerald-600" />, text: "Eliminate Middlemen" },
        { icon: <Cpu className="w-4 h-4 text-sky-600" />, text: "AI-Driven Decisions" },
        { icon: <Shield className="w-4 h-4 text-violet-600" />, text: "Data Privacy First" },
        { icon: <Users className="w-4 h-4 text-amber-600" />, text: "Community-Powered" },
    ];

    return (
        <section id="about" className="py-24 sm:py-32 bg-background relative overflow-hidden">
            <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-emerald-50/50 dark:from-emerald-950/20 to-transparent pointer-events-none" />

            <div ref={ref} className="container mx-auto px-4 sm:px-6 relative">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Left: text */}
                    <div className={`transition-all duration-700 ${inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
                        <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full px-3.5 py-1.5 mb-5 border border-amber-200 dark:border-amber-800/60">
                            <Award className="w-3 h-3" /> Our Mission
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight mb-6 leading-[1.1]">
                            Built for Farmers,<br />
                            <span className="text-emerald-600 dark:text-emerald-500">by Farmers</span>
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed mb-4">
                            Farmer's Connect is a platform dedicated to empowering farmers with small landholdings. By connecting farmers in groups based on their area and soil type, providing expert guidance, and creating direct market access, we transform livelihoods.
                        </p>
                        <p className="text-muted-foreground text-base leading-relaxed mb-8">
                            Our mission is simple: eliminate the middleman, reduce resource waste, and ensure every farmer earns the profit they deserve — through direct sales, restaurant chains, or community-supported agriculture.
                        </p>

                        {/* Pillars */}
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {pillars.map((p, i) => (
                                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                                    <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center flex-shrink-0 shadow-sm">{p.icon}</div>
                                    <span className="text-[13px] font-semibold text-foreground">{p.text}</span>
                                </div>
                            ))}
                        </div>

                        <Link to="/sign-up">
                            <button className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[14px] px-6 py-3 rounded-xl shadow-sm transition-all duration-300 hover:scale-[1.02]">
                                Join the Movement
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </Link>
                    </div>

                    {/* Right: visual card stack */}
                    <div className={`transition-all duration-700 ${inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`} style={{ transitionDelay: "200ms" }}>
                        <div className="relative">
                            {/* Main card */}
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl relative z-10">
                                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                        <Sprout className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">KrishiMitra AI</p>
                                        <p className="text-xs text-muted-foreground">Your farming assistant</p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
                                    </div>
                                </div>

                                {/* Mock recommendation */}
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Today's Recommendation</p>
                                    {[
                                        { label: "Best Crop", value: "Soybean (Rabi)", color: "emerald" },
                                        { label: "Soil Fertility", value: "High — Black Soil", color: "amber" },
                                        { label: "Rain Forecast", value: "87mm this week", color: "sky" },
                                        { label: "Market Price", value: "₹4,200 / quintal ↑", color: "violet" },
                                    ].map((row, j) => (
                                        <div key={j} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                                            <span className="text-[12px] text-muted-foreground">{row.label}</span>
                                            <span className={`text-[12px] font-bold ${colorMap[row.color].text}`}>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Behind card shadow */}
                            <div className="absolute top-4 left-4 right-4 bottom-0 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 z-0" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── CTA Banner ───────────────────────────────────────────────────────────────
const CTABanner = () => {
    const { ref, inView } = useInView();
    return (
        <section className="py-16 sm:py-20 bg-background">
            <div ref={ref} className="container mx-auto px-4 sm:px-6">
                <div className={`relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-3xl p-8 sm:p-14 text-center overflow-hidden transition-all duration-700 ${inView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
                    {/* Background accents */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-300/10 rounded-full blur-3xl" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-2 bg-teal-400/70 border border-white/30 text-white text-xs font-bold rounded-full px-3.5 py-1.5 mb-5">
                            <Sprout className="w-3 h-3" /> Free to join · No hidden fees
                        </div>
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight ">
                            Ready to Transform<br />Your Farm?
                        </h2>
                        <p className="text-white/80 text-base sm:text-lg max-w-lg mx-auto mb-8">
                            Join 50,000+ farmers who are already growing smarter, selling direct, and earning more.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link to="/sign-up">
                                <button className="group flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-emerald-700 font-bold text-[15px] px-8 py-3.5 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.03]">
                                    Get Started — It's Free
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </Link>
                            <a href="#how-it-works">
                                <button className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold text-[15px] px-8 py-3.5 rounded-xl border border-white/30 transition-all duration-300">
                                    Learn More
                                </button>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = () => (
    <footer className="bg-zinc-950 dark:bg-zinc-950 border-t border-zinc-800 py-12">
        <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
                {/* Brand */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                            <Sprout className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-[15px] text-white">Farmer's<span className="text-emerald-400">Connect</span></span>
                    </div>
                    <p className="text-zinc-400 text-[13px] leading-relaxed max-w-xs">
                        Empowering Indian farmers with AI technology, direct markets, and community support.
                    </p>
                </div>
                {/* Links */}
                <div>
                    <p className="text-zinc-300 text-xs font-bold uppercase tracking-widest mb-3">Platform</p>
                    <div className="space-y-2">
                        {[["#services","Services"],["#how-it-works","How It Works"],["#about","About"]].map(([href, label]) => (
                            <a key={href} href={href} className="block text-zinc-400 hover:text-zinc-100 text-[13px] transition-colors">{label}</a>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-zinc-300 text-xs font-bold uppercase tracking-widest mb-3">Account</p>
                    <div className="space-y-2">
                        <Link to="/sign-in" className="block text-zinc-400 hover:text-zinc-100 text-[13px] transition-colors">Sign In</Link>
                        <Link to="/sign-up" className="block text-zinc-400 hover:text-zinc-100 text-[13px] transition-colors">Join Now</Link>
                    </div>
                </div>
            </div>
            <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-zinc-500 text-xs">© 2026 Farmer's Connect. All rights reserved.</p>
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                    <Leaf className="w-3 h-3 text-emerald-600" />
                    <span>Built with ♥ for Indian Farmers</span>
                </div>
            </div>
        </div>
    </footer>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const Index = () => (
    <div className="min-h-screen bg-background antialiased">
        <Navbar />
        <Hero />
        <Services />
        <TechStrip />
        <HowItWorks />
        <Stats />
        <About />
        <CTABanner />
        <Footer />
    </div>
);

export default Index;