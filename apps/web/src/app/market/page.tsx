import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Navigation } from '@/components/landing/navigation';
import { MarketTrends } from '@/components/market/market-trends';

const Footer = dynamic(() => import('@/components/landing/footer').then(mod => mod.Footer));

export const metadata: Metadata = {
  title: 'Market Trends | CareerGap AI',
  description: 'Explore real-time insights into skill demand and tech market value.',
};

export default function PublicMarketPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-background">
      <Navigation />
      <main className="flex-1 pt-24 pb-16 px-6 mx-auto w-full max-w-7xl">
        <MarketTrends />
      </main>
      <Footer />
    </div>
  );
}
