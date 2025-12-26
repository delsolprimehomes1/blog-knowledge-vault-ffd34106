import { motion } from "framer-motion";
import { MapPin, Bed, Bath, Maximize } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PropertyHeaderProps {
  title: string;
  location: string;
  province: string;
  price: string;
  reference: string;
  bedrooms?: number;
  bathrooms?: number;
  builtArea?: number;
}

export const PropertyHeader = ({
  title,
  location,
  province,
  price,
  reference,
  bedrooms,
  bathrooms,
  builtArea,
}: PropertyHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-8">
        {/* Left side - Property info */}
        <div className="flex-1 space-y-3">
          {/* Location badge */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-pulse" />
              <MapPin className="w-4 h-4 text-primary ml-3" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {location}, {province}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground leading-tight">
            {title}
          </h1>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {bedrooms !== undefined && bedrooms > 0 && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-medium">
                <Bed className="w-4 h-4" />
                {bedrooms} {bedrooms === 1 ? 'Bed' : 'Beds'}
              </Badge>
            )}
            {bathrooms !== undefined && bathrooms > 0 && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-medium">
                <Bath className="w-4 h-4" />
                {bathrooms} {bathrooms === 1 ? 'Bath' : 'Baths'}
              </Badge>
            )}
            {builtArea !== undefined && builtArea > 0 && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-medium">
                <Maximize className="w-4 h-4" />
                {builtArea}m²
              </Badge>
            )}
          </div>
        </div>

        {/* Right side - Price and reference */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-start lg:items-end gap-1"
        >
          <div className="glass-luxury rounded-2xl px-5 py-3 md:px-6 md:py-4">
            <p className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-primary">
              {price}
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono tracking-wide px-2">
            Ref: {reference}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};
