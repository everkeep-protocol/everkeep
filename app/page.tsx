import { AppShell } from "@/components/layout/app-shell";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MetricCards } from "@/components/landing/metric-cards";

export default function HomePage() {
  return (
    <AppShell>
      <HeroSection />
      <MetricCards />
      <HowItWorks />
    </AppShell>
  );
}
