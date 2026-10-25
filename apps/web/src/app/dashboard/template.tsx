'use client';

import { motion } from 'framer-motion';
import React from 'react';

// Opacity and translate only: a lingering transform/filter on this wrapper would trap `position: fixed` modals inside pages.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
