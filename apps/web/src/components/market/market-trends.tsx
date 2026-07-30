'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BarChart, ArrowUpRight, ArrowDownRight, Minus, Briefcase } from 'lucide-react';
import { useMarketTrends, useSkillSearch } from '@/hooks/use-market';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import type { SkillMarketData } from '@career-gap-ai/shared';
import { TrendDirection } from '@career-gap-ai/shared';

export function MarketTrends() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  const { data: trendingSkills, isLoading: isLoadingTrending } = useMarketTrends(12);
  const { data: searchResults, isLoading: isLoadingSearch } = useSkillSearch(debouncedSearch);

  const displayData = debouncedSearch ? searchResults : trendingSkills;
  const isLoading = debouncedSearch ? isLoadingSearch : isLoadingTrending;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Market Trends</h1>
        <p className="mt-1 text-muted-foreground">Real-time insights into skill demand and market value</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a skill (e.g., Python, React, AWS)..."
          className="input-field pl-12 h-14 text-base bg-card shadow-sm"
        />
      </div>

      {/* Results */}
      <div>
        <h2 className="mb-4 font-semibold">
          {debouncedSearch ? 'Search Results' : 'Trending Skills Now'}
        </h2>
        
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 shimmer rounded-2xl" />
            ))}
          </div>
        ) : displayData && displayData.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayData.map((item: SkillMarketData, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 hover:bg-foreground/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold">{item.skill}</h3>
                    <div className="mt-1 text-xs text-muted-foreground">{item.relatedSkills?.[0] || 'Technical Skill'}</div>
                  </div>
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold",
                    item.trend === TrendDirection.RISING ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" :
                    item.trend === TrendDirection.DECLINING ? "border-red-500/20 bg-red-500/10 text-red-400" :
                    "border-border bg-muted text-muted-foreground"
                  )}>
                    {item.trend === TrendDirection.RISING ? <ArrowUpRight className="h-4 w-4" /> :
                     item.trend === TrendDirection.DECLINING ? <ArrowDownRight className="h-4 w-4" /> :
                     <Minus className="h-4 w-4" />}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Demand Score</span>
                      <span className="font-medium text-brand-400">{item.demandScore.toFixed(1)}/10</span>
                    </div>
                    <div className="progress-bar h-1.5">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${item.demandScore * 10}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs border-t border-border pt-3">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Mentioned in
                    </div>
                    <div className="font-medium">{(item.jobCount || 0).toLocaleString()} jobs</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold">No skills found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Market insights summary block */}
      <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-6">
        <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <BarChart className="h-5 w-5 text-brand-500" />
          AI Market Insight
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The technology job market is seeing a rapid shift towards AI integration and Cloud Architecture. 
          Skills like Python, PyTorch, and AWS continue to dominate in high-paying roles. To maximize your 
          hireability, we recommend focusing on "T-shaped" skill development: deep expertise in one core area 
          (like React or Node.js) combined with broad knowledge of adjacent technologies (like CI/CD, basic 
          machine learning concepts, or cloud deployment).
        </p>
      </div>
    </div>
  );
}
