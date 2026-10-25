'use client';

import dynamic from 'next/dynamic';
import { Navigation } from '@/components/landing/navigation';
import { HeroSection } from '@/components/landing/hero-section';
import { SkillsMarquee } from '@/components/landing/skills-marquee';

// Lazy load below-the-fold components
const FeaturesSection = dynamic(() => import('@/components/landing/features-section').then(mod => mod.FeaturesSection));
const HowItWorksSection = dynamic(() => import('@/components/landing/how-it-works-section').then(mod => mod.HowItWorksSection));
const TestimonialsSection = dynamic(() => import('@/components/landing/testimonials-section').then(mod => mod.TestimonialsSection));
const CTASection = dynamic(() => import('@/components/landing/cta-section').then(mod => mod.CTASection));
const Footer = dynamic(() => import('@/components/landing/footer').then(mod => mod.Footer));

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <Navigation />
      <HeroSection />
      <SkillsMarquee />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
