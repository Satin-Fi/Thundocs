import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-[1.05]">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to bottom right, rgba(95, 229, 254, 0.1), transparent)' }}></div>
      
      <div className="relative">
        <div className="p-3 rounded-xl border border-white/20 w-fit mb-4" style={{ background: 'linear-gradient(to bottom right, rgba(95, 229, 254, 0.2), rgba(0, 212, 255, 0.2))' }}>
          <Icon className="w-6 h-6" style={{ color: '#5fe5fe' }} />
        </div>
        
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{description}</p>
      </div>
    </div>
  );
}