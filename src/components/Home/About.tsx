import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { motion } from 'motion/react';
import { Package, ShieldCheck, Truck, Users } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { StoreConfig } from '../../types';

interface AboutProps {
  config: StoreConfig;
}

export default function About({ config }: AboutProps) {

  const stats = [
    { icon: <Package className="w-6 h-6" />, label: "Wide Variety", desc: "From staples to cosmetics" },
    { icon: <ShieldCheck className="w-6 h-6" />, label: "Pure Quality", desc: "Handpicked fresh items" },
    { icon: <Truck className="w-6 h-6" />, label: "Fast Service", desc: "Local quick delivery" },
    { icon: <Users className="w-6 h-6" />, label: "Trusted Shop", desc: "Serving our community" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar onSearch={() => {}} config={config} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-brand-accent py-20 px-4 md:px-10 text-white text-center overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="grid grid-cols-12 gap-1 w-full h-full">
                {[...Array(144)].map((_, i) => <div key={i} className="border border-white/20 aspect-square" />)}
             </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto relative z-10"
          >
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-none tracking-tighter mb-6">Our Story</h1>
            <p className="text-xl md:text-2xl font-light italic opacity-90 max-w-2xl mx-auto leading-relaxed">
              "Bringing fresh groceries and daily essentials to your family with trust and quality for years."
            </p>
          </motion.div>
        </section>

        {/* Content Section */}
        <section className="max-w-5xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-display font-bold text-brand-accent">Why Shop with Us?</h2>
              <p className="text-lg text-brand-muted leading-relaxed">
                At Raj Kirana Store, we believe that every household deserves access to high-quality groceries at fair prices. 
                What started as a small local shop has grown into a trusted name for daily essentials, rashan, and personal care.
              </p>
              <p className="text-lg text-brand-muted leading-relaxed">
                We bridge the gap between quality and affordability. Every item in our inventory is carefully checked 
                for freshness and quality before it reaches your hand.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-2xl border border-brand-border hover:border-brand-accent transition-colors">
                  <div className="text-brand-accent mb-4">{s.icon}</div>
                  <h3 className="font-bold text-sm mb-1">{s.label}</h3>
                  <p className="text-[10px] uppercase font-bold text-brand-muted tracking-wider">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commitment */}
        <section className="bg-gray-50 py-20 px-4 md:px-10 border-y border-brand-border">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-xs uppercase font-bold tracking-[0.3em] text-brand-muted mb-8">Our Commitment</h3>
            <p className="text-2xl font-display font-medium text-brand-accent leading-relaxed italic">
              "We don't just sell products; we maintain relationships. Your trust is our greatest asset, 
              and we strive to keep it through every single transaction."
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-border py-10 px-6 text-center text-xs text-brand-muted uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} Raj Kirana Store &bull; Quality and Freshness
      </footer>
    </div>
  );
}
