import { BarChart3, Bot, Globe, Phone, Shield, Zap } from "lucide-react";

export const FEATURES = [
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

export const STATS = [
  { value: "2.4M+", label: "Calls Handled" },
  { value: "98.7%", label: "Uptime SLA" },
  { value: "340%", label: "Avg. ROI" },
  { value: "< 200ms", label: "Response Time" },
];

export const PRICING_PLANS = [
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

export const TESTIMONIALS = [
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

export const LOGOS = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Hooli",
  "Piedmont",
  "Soylent",
];

export const FOOTER_LINKS = [
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
];
