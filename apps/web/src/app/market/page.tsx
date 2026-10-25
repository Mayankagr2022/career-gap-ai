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
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 pb-16 pt-24 sm:px-6">
        <MarketTrends standalone />
      </main>
      <Footer />
    </div>
  );
}
