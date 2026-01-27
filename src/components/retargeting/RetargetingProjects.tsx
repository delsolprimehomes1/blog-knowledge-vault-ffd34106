import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

// Static placeholder properties for Phase 1
const placeholderProperties = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop",
    location: "Marbella",
    description: "Contemporary living in the heart of the Golden Mile",
    slug: "marbella-golden-mile",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
    location: "Estepona",
    description: "Charming coastal town with authentic Spanish character",
    slug: "estepona-coastal",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop",
    location: "Benahavís",
    description: "Mountain views and golf courses in a peaceful setting",
    slug: "benahavis-mountain",
  },
];

export const RetargetingProjects = () => {
  return (
    <section className="bg-[#f8f9fa] py-20 md:py-24 lg:py-28">
      <div className="max-w-6xl mx-auto px-6">
        {/* Intro Copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-[#6b7280] text-base md:text-lg mb-2">
            Some visitors prefer to explore examples first.
          </p>
          <p className="text-[#6b7280] text-base md:text-lg">
            Below is a small, curated selection for context only.
          </p>
        </motion.div>
        
        {/* Property Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {placeholderProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg overflow-hidden shadow-[0_2px_15px_rgba(0,0,0,0.05)] border border-slate-100"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={property.image}
                  alt={property.location}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Content */}
              <div className="p-5 md:p-6">
                <h3 className="text-lg font-medium text-[#1a1f2e] mb-2">
                  {property.location}
                </h3>
                <p className="text-[#6b7280] text-sm mb-4 leading-relaxed">
                  {property.description}
                </p>
                
                {/* Subtle link */}
                <a
                  href={`/en/property/${property.slug}`}
                  className="inline-flex items-center text-sm text-[#1a1f2e]/70 hover:text-[#1a1f2e] transition-colors group"
                >
                  View details
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
