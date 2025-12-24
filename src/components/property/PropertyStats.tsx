import { useRef, useEffect, useState } from "react";
import { Bed, Bath, Maximize2, Grid3X3, Compass, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

interface PropertyStatsProps {
  bedrooms: number;
  bathrooms: number;
  builtArea: number;
  plotArea?: number;
  orientation?: string;
  views?: string;
}

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  delay: number;
}

const StatItem = ({ icon, value, suffix = "", label, delay }: StatItemProps) => {
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  
  const { formattedValue, startAnimation } = useCountUp({
    end: value,
    duration: 1500,
    delay: delay,
    suffix,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
            startAnimation();
          }
        });
      },
      { threshold: 0.3 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted, startAnimation]);

  return (
    <motion.div
      ref={elementRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
      className="stat-card-premium glass-luxury rounded-2xl p-6 text-center group hover:scale-105 transition-all duration-300"
    >
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div className="text-3xl font-display font-bold text-foreground mb-1">
        {hasStarted ? formattedValue : "0" + suffix}
      </div>
      <div className="text-sm text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
    </motion.div>
  );
};

interface TextStatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: number;
}

const TextStatItem = ({ icon, value, label, delay }: TextStatItemProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: delay / 1000 }}
    className="stat-card-premium glass-luxury rounded-2xl p-6 text-center group hover:scale-105 transition-all duration-300"
  >
    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
      {icon}
    </div>
    <div className="text-xl font-display font-bold text-foreground mb-1 capitalize">
      {value}
    </div>
    <div className="text-sm text-muted-foreground uppercase tracking-wider">
      {label}
    </div>
  </motion.div>
);

export const PropertyStats = ({
  bedrooms,
  bathrooms,
  builtArea,
  plotArea,
  orientation,
  views,
}: PropertyStatsProps) => {
  return (
    <div className="relative -mt-20 z-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Floating Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatItem
            icon={<Bed className="w-6 h-6 text-primary" />}
            value={bedrooms}
            label="Bedrooms"
            delay={0}
          />
          <StatItem
            icon={<Bath className="w-6 h-6 text-primary" />}
            value={bathrooms}
            label="Bathrooms"
            delay={100}
          />
          <StatItem
            icon={<Maximize2 className="w-6 h-6 text-primary" />}
            value={builtArea}
            suffix="m²"
            label="Built Area"
            delay={200}
          />
          {plotArea && (
            <StatItem
              icon={<Grid3X3 className="w-6 h-6 text-primary" />}
              value={plotArea}
              suffix="m²"
              label="Plot Area"
              delay={300}
            />
          )}
          {orientation && (
            <TextStatItem
              icon={<Compass className="w-6 h-6 text-primary" />}
              value={orientation}
              label="Orientation"
              delay={400}
            />
          )}
          {views && (
            <TextStatItem
              icon={<Eye className="w-6 h-6 text-primary" />}
              value={views}
              label="Views"
              delay={500}
            />
          )}
        </div>
      </div>
    </div>
  );
};
