import { useState } from "react";
import { motion } from "framer-motion";
import { Linkedin, Globe, Award, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TeamMemberModal } from "@/components/team/TeamMemberModal";
import { useTranslation } from "@/i18n";

interface Founder {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  linkedin_url: string;
  credentials: string[];
  years_experience: number;
  languages: string[];
  specialization: string;
}

interface FounderProfilesProps {
  founders: Founder[];
}

// Transform Founder to TeamMember format for modal compatibility
const transformFounderToTeamMember = (founder: Founder) => ({
  id: founder.name.toLowerCase().replace(/\s+/g, '-'),
  name: founder.name,
  role: founder.role,
  role_translations: null,
  bio: founder.bio,
  bio_translations: null,
  photo_url: founder.photo_url,
  email: null,
  phone: null,
  whatsapp: null,
  linkedin_url: founder.linkedin_url,
  languages_spoken: founder.languages,
  specializations: [founder.specialization],
  areas_of_expertise: null,
  years_experience: founder.years_experience,
  credentials: founder.credentials,
  is_founder: true,
});

export const FounderProfiles = ({ founders }: FounderProfilesProps) => {
  const [selectedFounder, setSelectedFounder] = useState<Founder | null>(null);
  const { t } = useTranslation();
  const aboutUs = t.aboutUs as Record<string, unknown> | undefined;
  const foundersSection = aboutUs?.founders as { badge?: string; heading?: string; subheading?: string; specialization?: string; viewProfile?: string } | undefined;

  if (!founders || founders.length === 0) return null;

  const handleCardClick = (founder: Founder) => {
    setSelectedFounder(founder);
  };

  const handleCloseModal = () => {
    setSelectedFounder(null);
  };

  return (
    <section className="py-20 bg-white" aria-labelledby="founders-heading">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-prime-gold/10 text-prime-gold border-0">
              <Shield className="w-3 h-3 mr-1" />
              {foundersSection?.badge || "Expert Team"}
            </Badge>
            <h2 id="founders-heading" className="font-serif text-3xl md:text-4xl font-bold text-prime-900 mb-4">
              {foundersSection?.heading || "Meet The Founders"}
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              {foundersSection?.subheading || "Three experienced professionals united by a passion for helping clients find their perfect Spanish home"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {founders.map((founder, index) => (
              <motion.div
                key={founder.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <Card 
                  className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer hover:scale-[1.02]"
                  onClick={() => handleCardClick(founder)}
                >
                  {/* Header with gradient */}
                  <div className="bg-gradient-to-br from-prime-900 to-prime-800 p-6 text-center relative">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    
                    <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-prime-gold/30 shadow-xl relative z-10">
                      <AvatarImage 
                        src={founder.photo_url} 
                        alt={founder.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-prime-gold text-white text-2xl font-serif">
                        {founder.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="font-serif text-xl font-bold text-white mb-1 relative z-10">
                      {founder.name}
                    </h3>
                    <p className="text-prime-gold text-sm font-medium relative z-10">
                      {founder.role}
                    </p>
                    
                    {/* Experience badge */}
                    <div className="absolute top-4 right-4 bg-prime-gold text-prime-900 text-xs font-bold px-2 py-1 rounded-full">
                      {founder.years_experience}+ yrs
                    </div>
                  </div>

                  <CardContent className="p-6">
                    {/* Bio */}
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      {founder.bio}
                    </p>

                    {/* Specialization */}
                    <div className="mb-4">
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{foundersSection?.specialization || "Specialization"}</span>
                      <p className="text-prime-800 font-medium text-sm mt-1">{founder.specialization}</p>
                    </div>

                    {/* Languages */}
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-4 h-4 text-prime-gold" />
                      <span className="text-sm text-slate-600">
                        {founder.languages.join(', ')}
                      </span>
                    </div>

                    {/* Credentials */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {founder.credentials.slice(0, 2).map((cred, i) => (
                        <Badge key={i} variant="outline" className="text-xs border-prime-gold/30 text-prime-800">
                          <Award className="w-3 h-3 mr-1 text-prime-gold" />
                          {cred}
                        </Badge>
                      ))}
                    </div>

                    {/* LinkedIn button */}
                    <Button 
                      variant="outline" 
                      className="w-full border-prime-gold/30 text-prime-800 hover:bg-prime-gold hover:text-white transition-colors"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={founder.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4 mr-2" />
                        {foundersSection?.viewProfile || "View Profile"}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Modal for founder details */}
      <TeamMemberModal
        member={selectedFounder ? transformFounderToTeamMember(selectedFounder) : null}
        isOpen={!!selectedFounder}
        onClose={handleCloseModal}
      />
    </section>
  );
};