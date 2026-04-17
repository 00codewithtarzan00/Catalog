import { StoreConfig } from '../../types';

interface HeroProps {
  config: StoreConfig;
}

export default function Hero({ config }: HeroProps) {
  const bgImage = config.heroImageUrl || 'https://images.unsplash.com/photo-1515204439045-8c08ef7fc5b2?auto=format&fit=crop&q=80&w=1920';

  return (
    <header className="relative h-48 md:h-64 flex items-center overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(42, 84, 49, 0.8), rgba(42, 84, 49, 0.9)), url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10 px-6 md:px-10 animate-fade-in max-w-7xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl text-white font-display font-bold mb-2 tracking-tighter shadow-sm">
          Raj Kirana Store
        </h1>
        <p className="text-white text-base md:text-lg italic font-display opacity-90 max-w-2xl">
          {config.heroSlogan || 'Quality You Trust, Freshness You Deserve'}
        </p>
      </div>
    </header>
  );
}
