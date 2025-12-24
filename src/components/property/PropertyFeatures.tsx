import { motion } from "framer-motion";
import { 
  Waves, 
  Trees, 
  Car, 
  Compass, 
  Eye, 
  Dumbbell, 
  Wifi, 
  Wind, 
  Sun, 
  Home,
  Shield,
  Flame,
  Droplets,
  Mountain,
  Building,
  Sparkles
} from "lucide-react";

interface PropertyFeaturesProps {
  features: string[];
  pool?: string;
  garden?: string;
  parking?: string;
  orientation?: string;
  views?: string;
}

// Map feature keywords to icons
const getFeatureIcon = (feature: string) => {
  const lowerFeature = feature.toLowerCase();
  
  if (lowerFeature.includes("pool") || lowerFeature.includes("piscina")) return Waves;
  if (lowerFeature.includes("garden") || lowerFeature.includes("jardin") || lowerFeature.includes("jardín")) return Trees;
  if (lowerFeature.includes("garage") || lowerFeature.includes("parking") || lowerFeature.includes("garaje")) return Car;
  if (lowerFeature.includes("gym") || lowerFeature.includes("fitness")) return Dumbbell;
  if (lowerFeature.includes("wifi") || lowerFeature.includes("internet")) return Wifi;
  if (lowerFeature.includes("air") || lowerFeature.includes("clima") || lowerFeature.includes("conditioning")) return Wind;
  if (lowerFeature.includes("terrace") || lowerFeature.includes("terraza") || lowerFeature.includes("solarium")) return Sun;
  if (lowerFeature.includes("security") || lowerFeature.includes("seguridad") || lowerFeature.includes("alarm")) return Shield;
  if (lowerFeature.includes("fireplace") || lowerFeature.includes("chimenea")) return Flame;
  if (lowerFeature.includes("jacuzzi") || lowerFeature.includes("spa") || lowerFeature.includes("sauna")) return Droplets;
  if (lowerFeature.includes("mountain") || lowerFeature.includes("montaña")) return Mountain;
  if (lowerFeature.includes("sea") || lowerFeature.includes("beach") || lowerFeature.includes("mar") || lowerFeature.includes("playa")) return Eye;
  if (lowerFeature.includes("lift") || lowerFeature.includes("elevator") || lowerFeature.includes("ascensor")) return Building;
  if (lowerFeature.includes("luxury") || lowerFeature.includes("premium")) return Sparkles;
  
  return Home;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export const PropertyFeatures = ({
  features,
  pool,
  garden,
  parking,
  orientation,
  views,
}: PropertyFeaturesProps) => {
  // Combine all features including amenities
  const allFeatures: { name: string; value?: string }[] = [
    ...(pool ? [{ name: "Pool", value: pool }] : []),
    ...(garden ? [{ name: "Garden", value: garden }] : []),
    ...(parking ? [{ name: "Parking", value: parking }] : []),
    ...(orientation ? [{ name: "Orientation", value: orientation }] : []),
    ...(views ? [{ name: "Views", value: views }] : []),
    ...features.map(f => ({ name: f })),
  ];

  if (allFeatures.length === 0) return null;

  return (
    <section className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground accent-line-gold">
          Property Features
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          Discover the exceptional amenities this property has to offer
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {allFeatures.map((feature, index) => {
          const IconComponent = getFeatureIcon(feature.name);
          
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative glass-luxury rounded-2xl p-5 overflow-hidden card-3d cursor-default"
            >
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
              </div>
              
              {/* Content */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {feature.name}
                  </h3>
                  {feature.value && (
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                      {feature.value}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Accent Line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
};
