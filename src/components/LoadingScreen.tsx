import React from 'react';
import { motion } from 'motion/react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white overflow-hidden">
      {/* Background Abstract Shapes */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          opacity: [0.05, 0.1, 0.05]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-[800px] h-[800px] bg-brand-accent rounded-full -top-1/4 -left-1/4 blur-3xl pointer-events-none"
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          rotate: [90, 0, 90],
          opacity: [0.03, 0.08, 0.03]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute w-[600px] h-[600px] bg-brand-accent rounded-full -bottom-1/4 -right-1/4 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Particle/Dot Animation */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -15, 0],
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-3 h-3 bg-brand-accent rounded-full"
            />
          ))}
        </div>

        {/* Text Animation */}
        <motion.div
          initial={{ opacity: 0, letterSpacing: "-0.05em" }}
          animate={{ opacity: 1, letterSpacing: "0.05em" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl font-display font-black text-brand-accent tracking-tighter uppercase italic">
            Raj Kirana Store
          </h1>
          
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, delay: 0.5, ease: "circOut" }}
            className="h-px w-full bg-brand-accent mt-2 origin-left"
          />
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.2 }}
            className="mt-4 text-[10px] uppercase tracking-[0.5em] font-bold text-brand-muted"
          >
            Crafting Freshness & Quality
          </motion.p>
        </motion.div>
      </div>

      {/* Floating Sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: 0 
            }}
            animate={{ 
              y: [null, "-10vh"],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: 3 + Math.random() * 4, 
              repeat: Infinity, 
              delay: Math.random() * 5 
            }}
            className="absolute w-1 h-1 bg-brand-accent/30 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}
