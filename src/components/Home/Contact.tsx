import React from 'react';
import Navbar from './Navbar';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onSearch={() => {}} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-accent tracking-tight mb-4">Contact Us</h1>
          <p className="text-brand-muted max-w-lg mx-auto leading-relaxed">
            Have a question about our stock or prices? Need to place a bulk order? 
            Reach out to us and we'll be happy to help!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Contact Details */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-border flex items-start gap-4">
              <div className="w-12 h-12 bg-brand-accent/10 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-brand-accent" />
              </div>
              <div>
                <h3 className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-1">Email Us</h3>
                <a href="mailto:tarzanmaurya1234@gmail.com" className="text-lg font-semibold text-brand-accent hover:underline break-all">
                  tarzanmaurya1234@gmail.com
                </a>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-border flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-1">WhatsApp</h3>
                <a href="https://wa.me/918182831828" target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-green-600 hover:underline">
                  +91 8182831828
                </a>
                <p className="text-sm text-brand-muted">Available for quick queries and pricing info.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-border flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-1">Business Hours</h3>
                <p className="text-lg font-semibold">6:00 AM - 8:00 PM</p>
                <p className="text-sm text-brand-muted">Monday to Sunday (All Days Open)</p>
              </div>
            </div>
          </motion.div>

          {/* Location / Meta Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-brand-accent p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-16 h-1 bg-white/30 rounded-full mb-8" />
              <h2 className="text-3xl font-display font-bold leading-tight mb-6 italic">"Serving quality kirana and fresh groceries to you and your family."</h2>
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-xl">Raj Kirana Store</p>
                  <p className="text-white/80 leading-relaxed font-sans">
                    Vill. - Bagapar, Deoria<br />
                    Uttar Pradesh - 274202
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 flex items-center gap-2 pt-8 border-t border-white/20">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <p className="text-xs uppercase font-bold tracking-widest">Always Ready To Help</p>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-brand-border py-10 px-6 text-center text-xs text-brand-muted uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} Raj Kirana Store &bull; Quality and Freshness
      </footer>
    </div>
  );
}
