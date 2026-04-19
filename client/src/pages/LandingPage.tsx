import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/HeroSection";
import LogoSection from "@/components/landing/LogoSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureSection from "@/components/landing/FeatureSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialSection from "@/components/landing/TestimonialSection";
import CTASection from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <LogoSection />
      <StatsSection />
      <FeatureSection />
      <HowItWorksSection />
      {/* <PricingSection /> */}
      <TestimonialSection />
      <CTASection />
      <Footer />
    </div>
  );
}
