import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Phone,
  Bot,
  BarChart3,
  Zap,
  Globe,
  Shield,
  Users,
  ArrowRight,
  Check,
  Star,
  PhoneCall,
  TrendingUp,
  Clock,
  Headphones,
  Play,
  ChevronRight,
  Sparkles,
  MessageSquare,
} from "lucide-react";

/* ── Data ──────────────────────────────────────────────── */

const features = [
  {
    icon: Bot,
    title: "AI Voice Agents",
    description:
      "Deploy human-sounding agents that handle calls autonomously — booking demos, qualifying leads, and answering FAQs 24/7.",
  },
  {
    icon: Phone,
    title: "Campaign Engine",
    description:
      "Launch outbound campaigns with smart dialing, retry logic, and real-time monitoring across thousands of contacts.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    description:
      "Track every call in real-time with sentiment analysis, outcome tracking, and cost breakdowns per campaign.",
  },
  {
    icon: Globe,
    title: "10+ Integrations",
    description:
      "Connect with HubSpot, Salesforce, Slack, Zapier, and custom webhooks to sync your entire workflow.",
  },
  {
    icon: Shield,
    title: "Enterprise Compliance",
    description:
      "Built-in DNC list checking, TCPA compliance, call recording consent, and voicemail detection.",
  },
  {
    icon: Zap,
    title: "Knowledge Base",
    description:
      "Upload docs, scrape URLs, and give your agents instant access to your product data — no hallucinations.",
  },
];

const stats = [
  { value: "2.4M+", label: "Calls Handled" },
  { value: "98.7%", label: "Uptime SLA" },
  { value: "340%", label: "Avg. ROI" },
  { value: "< 200ms", label: "Response Time" },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "For small teams getting started with AI calling.",
    features: [
      "1 AI agent",
      "500 calls/month",
      "1 campaign",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Growth",
    price: "$199",
    period: "/mo",
    description: "For growing teams that need power and flexibility.",
    features: [
      "5 AI agents",
      "5,000 calls/month",
      "Unlimited campaigns",
      "Advanced analytics & sentiment",
      "CRM integrations",
      "Knowledge base",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with custom requirements.",
    features: [
      "Unlimited agents",
      "Unlimited calls",
      "Custom integrations",
      "Dedicated account manager",
      "SSO & SAML",
      "Custom compliance",
      "SLA guarantee",
      "On-premise option",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const testimonials = [
  {
    quote:
      "We replaced our entire outbound SDR team with DialBridge agents. Our demo booking rate went up 40% and cost dropped by 70%.",
    author: "Sarah Chen",
    role: "VP of Sales",
    company: "TechCorp",
    avatar: "SC",
    rating: 5,
  },
  {
    quote:
      "The campaign engine is incredible. We ran 50,000 calls in a week with a 3-person team. The analytics alone are worth the price.",
    author: "Marcus Rivera",
    role: "Head of Growth",
    company: "ScaleUp Inc",
    avatar: "MR",
    rating: 5,
  },
  {
    quote:
      "Setup took 15 minutes. Our agents sound so natural that customers don't even realize they're talking to AI. Game changer.",
    author: "Priya Patel",
    role: "CTO",
    company: "Nexus Health",
    avatar: "PP",
    rating: 5,
  },
];

const logos = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Hooli",
  "Piedmont",
  "Soylent",
];

/* ── Component ─────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Navbar ──────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Phone className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold">DialBridge</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Testimonials
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")}>
              Get Started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="relative py-20 sm:py-28 lg:py-36">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-60 -left-40 h-[400px] w-[400px] rounded-full bg-warning/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-1.5 text-xs font-medium"
          >
            <Sparkles className="mr-1.5 h-3 w-3" />
            Now with GPT-4o Voice — Human-quality conversations
          </Badge>

          <h1 className="mx-auto max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
            AI voice agents that{" "}
            <span className="text-primary">close deals</span> while you sleep
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Deploy human-sounding AI agents to handle outbound calls, book
            demos, and qualify leads — at a fraction of the cost. Scale from 10
            to 100,000 calls per day.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 text-base"
              onClick={() => navigate("/signup")}
            >
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base group"
            >
              <Play className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
              Watch Demo
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required · 14-day free trial · Cancel anytime
          </p>

          {/* Hero visual — stylized dashboard preview */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="rounded-xl border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
              <div className="flex items-center gap-1.5 border-b px-4 py-3 bg-muted/50">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-warning/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">
                  dialbridge.ai/dashboard
                </span>
              </div>
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    {
                      icon: PhoneCall,
                      label: "Active Calls",
                      value: "24",
                      color: "text-primary",
                    },
                    {
                      icon: TrendingUp,
                      label: "Success Rate",
                      value: "68%",
                      color: "text-success",
                    },
                    {
                      icon: Users,
                      label: "Contacted",
                      value: "842",
                      color: "text-foreground",
                    },
                    {
                      icon: Clock,
                      label: "Avg. Duration",
                      value: "2:34",
                      color: "text-foreground",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border bg-background p-3 text-center"
                    >
                      <stat.icon
                        className={cn("h-4 w-4 mx-auto mb-1", stat.color)}
                      />
                      <p className="text-lg font-bold font-mono">
                        {stat.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="h-32 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border flex items-end px-4 pb-4 gap-2">
                  {[40, 55, 45, 65, 60, 80, 72, 90, 85, 95, 88, 75].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/30 rounded-sm transition-all"
                        style={{ height: `${h}%` }}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logos ────────────────────────────── */}
      <section className="border-y bg-muted/30 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-8">
            Trusted by 500+ companies worldwide
          </p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            {logos.map((name) => (
              <span
                key={name}
                className="text-lg font-display font-semibold text-muted-foreground/50"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-display font-bold text-primary">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────── */}
      <section id="features" className="py-20 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
              Everything you need to scale voice outreach
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-muted-foreground">
              From agent creation to campaign analytics — one platform to
              automate your entire calling workflow.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group transition-shadow hover:shadow-lg hover:shadow-primary/5 border-border/60"
              >
                <CardContent className="pt-6 space-y-3">
                  <div className="inline-flex rounded-xl bg-primary/10 p-3 group-hover:bg-primary/15 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
              Go live in under 10 minutes
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create Your Agent",
                desc: "Pick a voice, write a prompt, and configure tools. Your AI agent is ready to call in minutes.",
                icon: Bot,
              },
              {
                step: "02",
                title: "Launch a Campaign",
                desc: "Upload contacts, assign agents, set schedules and retry policies. Hit start.",
                icon: Headphones,
              },
              {
                step: "03",
                title: "Monitor & Optimize",
                desc: "Track calls in real-time, review transcripts, and refine your agents with actionable insights.",
                icon: BarChart3,
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center group">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-xs font-mono text-primary font-bold">
                  {item.step}
                </span>
                <h3 className="mt-1 text-lg font-display font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────── */}
      <section id="pricing" className="py-20 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative transition-shadow h-full",
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/60 hover:shadow-md",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 text-xs">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="pt-8 pb-6 space-y-6">
                  <div>
                    <h3 className="font-display font-semibold text-lg">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => navigate("/signup")}
                  >
                    {plan.cta}{" "}
                    {plan.popular && <ChevronRight className="ml-1 h-4 w-4" />}
                  </Button>
                  <Separator />
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────── */}
      <section id="testimonials" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              Testimonials
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
              Loved by sales teams everywhere
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card
                key={t.author}
                className="border-border/60 hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-warning text-warning"
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    "{t.quote}"
                  </p>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.author}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.role}, {t.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section className="py-20 bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="rounded-2xl border bg-card p-10 sm:p-14 shadow-lg shadow-primary/5">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              Ready to scale your outreach?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
              Join 500+ companies using DialBridge to automate their calling
              operations. Start your free trial today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-12 px-8"
                onClick={() => navigate("/signup")}
              >
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8"
                onClick={() => navigate("/login")}
              >
                Talk to Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                  <Phone className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold">DialBridge</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered voice agents for modern sales teams.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "Integrations"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Contact"],
              },
              {
                title: "Legal",
                links: ["Privacy", "Terms and Conditions", "Cookie Policy"],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="font-medium text-sm mb-3">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator className="my-8" />
          <p className="text-xs text-muted-foreground text-center">
            © 2025 DialBridge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
