import { Sprout, Tractor, Store, CloudSun, Users, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-farm.jpg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
    <div className="container mx-auto flex items-center justify-between h-16 px-4">
      <a href="#" className="flex items-center gap-2">
        <Tractor className="h-7 w-7 text-primary" />
        <span className="font-display text-xl font-bold text-foreground">Farmer's Connect</span>
      </a>
      <div className="hidden md:flex items-center gap-8">
        <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Services</a>
        <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
        <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
        <SignedOut>
          <Link to="/sign-in"><Button size="sm" variant="outline">Sign In</Button></Link>
          <Link to="/sign-up"><Button size="sm">Join Now</Button></Link>
        </SignedOut>
        <SignedIn>
          <Link to="/auth-callback"><Button size="sm" variant="outline">Dashboard</Button></Link>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </div>
  </nav>
);

const Hero = () => (
  <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0">
      <img src={heroImage} alt="Lush green farmland at golden hour" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[hsl(var(--hero-overlay)/0.6)]" />
    </div>
    <div className="relative z-10 container mx-auto px-4 text-center">
      <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 animate-fade-up text-balance">
        Grow Together,<br />Profit Together
      </h1>
      <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "0.2s" }}>
        Connecting farmers to guidance, equipment, and direct markets — eliminating middlemen and maximizing your profits with minimum resources.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: "0.4s" }}>
        <Link to="/sign-up">
          <Button variant="hero" size="lg" className="text-base">
            Get Started <ArrowRight className="ml-1 h-5 w-5" />
          </Button>
        </Link>
        <a href="#about">
          <Button variant="hero-outline" size="lg" className="text-base">
            Learn More
          </Button>
        </a>
      </div>
    </div>
  </section>
);

const services = [
  {
    icon: Sprout,
    title: "Crop Guidance",
    description: "Get soil-specific crop recommendations, seed selection, and fertilizer guidance tailored to your land.",
  },
  {
    icon: Tractor,
    title: "Equipment Rental",
    description: "Rent agricultural equipment from nearby farmers or list your own machinery for others to use.",
  },
  {
    icon: Store,
    title: "Direct Marketing",
    description: "Sell your produce directly to restaurants and consumers — no middlemen, maximum profit.",
  },
  {
    icon: CloudSun,
    title: "Weather Alerts",
    description: "Real-time weather forecasts and alerts to help you plan your farming activities effectively.",
  },
];

const Services = () => (
  <section id="services" className="py-24 bg-card">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <p className="text-sm font-semibold tracking-widest uppercase text-secondary mb-2">What We Offer</p>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
          Everything You Need to Thrive
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {services.map((service, i) => (
          <div
            key={service.title}
            className="group bg-background rounded-xl p-8 shadow-sm border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <service.icon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">{service.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{service.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const steps = [
  { number: "01", title: "Join & Connect", description: "Register and get grouped with farmers in your area based on soil type and location." },
  { number: "02", title: "Get Guidance", description: "Receive personalized recommendations for the best crops, seeds, and fertilizers for your soil." },
  { number: "03", title: "Grow & Rent", description: "Farm with confidence, renting equipment you need and listing your own for extra income." },
  { number: "04", title: "Sell Direct", description: "Sell your harvest directly to restaurants and buyers — keeping the profits you deserve." },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <p className="text-sm font-semibold tracking-widest uppercase text-secondary mb-2">Simple Process</p>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">How It Works</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, i) => (
          <div key={step.number} className="relative text-center">
            <span className="font-display text-6xl font-bold text-primary/10">{step.number}</span>
            <h3 className="font-display text-xl font-semibold text-foreground mt-2 mb-3">{step.title}</h3>
            <p className="text-muted-foreground">{step.description}</p>
            {i < steps.length - 1 && (
              <div className="hidden lg:block absolute top-8 -right-4 w-8">
                <ArrowRight className="h-6 w-6 text-secondary" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

const About = () => (
  <section id="about" className="py-24 bg-primary">
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto text-center">
        <Users className="h-12 w-12 text-primary-foreground/60 mx-auto mb-6" />
        <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
          Built for Farmers, by Farmers
        </h2>
        <p className="text-lg text-primary-foreground/80 leading-relaxed mb-4">
          Farmer's Connect is a platform dedicated to empowering farmers with small landholdings. We believe that by connecting farmers in groups based on their area and soil type, providing expert guidance on crop selection, and creating direct market access, we can transform livelihoods.
        </p>
        <p className="text-lg text-primary-foreground/80 leading-relaxed">
          Our mission is simple: eliminate the middleman, reduce resource waste, and ensure every farmer earns the profit they deserve — whether through direct sales, restaurant chains, or community-supported agriculture.
        </p>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-foreground py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Tractor className="h-6 w-6 text-secondary" />
          <span className="font-display text-lg font-bold text-background">Farmer's Connect</span>
        </div>
        <div className="flex gap-6 text-background/60 text-sm">
          <a href="#services" className="hover:text-background transition-colors">Services</a>
          <a href="#how-it-works" className="hover:text-background transition-colors">How It Works</a>
          <a href="#about" className="hover:text-background transition-colors">About</a>
        </div>
        <p className="text-background/40 text-sm">© 2026 Farmer's Connect. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <Hero />
    <Services />
    <HowItWorks />
    <About />
    <Footer />
  </div>
);

export default Index;
