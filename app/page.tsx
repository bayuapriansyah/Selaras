import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { HeroScrollStory } from "@/components/sections/HeroScrollStory";
import { Problem } from "@/components/sections/Problem";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { PassportSection } from "@/components/sections/PassportSection";
import { GoldenCase } from "@/components/sections/GoldenCase";
import { AiSection } from "@/components/sections/AiSection";
import { EvidenceGraph } from "@/components/sections/EvidenceGraph";
import { ScaleSection } from "@/components/sections/ScaleSection";
import { GovernanceSection } from "@/components/sections/GovernanceSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { FinalCTA } from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <HeroScrollStory />
        <Problem />
        <HowItWorks />
        <PassportSection />
        <GoldenCase />
        <AiSection />
        <EvidenceGraph />
        <ScaleSection />
        <GovernanceSection />
        <AboutSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
