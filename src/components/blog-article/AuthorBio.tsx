import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Linkedin, MessageCircle, Star, ShieldCheck, Award } from "lucide-react";
import { Author } from "@/types/blog";
import { translations } from "@/i18n/translations";

interface AuthorBioProps {
  author: Author;
  language?: string;
  localizedBio?: string;
}

export const AuthorBio = ({ author, language = 'en', localizedBio }: AuthorBioProps) => {
  // Get translations for the article's language, fallback to English
  const t = translations[language as keyof typeof translations]?.eeat || translations.en.eeat;
  
  // Use localized bio if available, otherwise use author's default bio
  const displayBio = localizedBio || author.bio;

  return (
    <Card className="my-12 md:my-16 border border-border bg-card shadow-lg overflow-hidden">
      <CardContent className="p-6 md:p-10">
        {/* Top Badges Bar */}
        {(author.is_expert_verified || author.is_licensed_professional || author.rating) && (
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6">
            {author.is_expert_verified && (
              <Badge className="bg-green-600 hover:bg-green-600 text-white border-0 gap-1.5 px-3 py-1.5 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.expertVerified}
              </Badge>
            )}
            {author.is_licensed_professional && (
              <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-0 gap-1.5 px-3 py-1.5 text-xs font-medium">
                <Award className="h-3.5 w-3.5" />
                {t.licensedProfessional}
              </Badge>
            )}
            {author.rating && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-500 gap-1.5 px-3 py-1.5 text-xs font-medium">
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                {author.rating.toFixed(1)}★ {t.rating}
              </Badge>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Avatar */}
          <div className="flex justify-center md:justify-start mb-6 md:mb-0">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-2 ring-primary/20 shadow-lg">
              <AvatarImage src={author.photo_url} alt={author.name} className="object-cover" />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4">
            {/* Name & Title */}
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                {author.name}
              </h3>
              <p className="text-base md:text-lg font-medium text-primary">
                {author.job_title}
              </p>
            </div>

            {/* Experience Statement */}
            {author.years_experience > 0 && (
              <p className="text-sm text-muted-foreground text-center md:text-left">
                {t.yearsExperience.replace('{years}', String(author.years_experience))}
              </p>
            )}

            {/* Bio */}
            <p className="text-sm md:text-base leading-relaxed text-foreground/90 text-center md:text-left">
              {displayBio}
            </p>

            {/* Credentials */}
            {author.credentials && author.credentials.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center md:text-left">
                  {t.professionalCredentials}
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {author.credentials.slice(0, 3).map((cred, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="inline-block text-xs sm:text-sm bg-muted hover:bg-muted border-0 font-normal py-1.5 px-3 leading-relaxed whitespace-normal text-left break-words"
                    >
                      {cred}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {author.linkedin_url && (
                <Button 
                  variant="outline" 
                  size="lg"
                  asChild
                  className="flex-1 min-h-[48px] border-primary/30 hover:bg-primary/5 hover:border-primary"
                >
                  <a
                    href={author.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-4 w-4 mr-2" />
                    {t.linkedinProfile}
                  </a>
                </Button>
              )}
              <Button 
                variant="default" 
                size="lg"
                asChild
                className="flex-1 min-h-[48px] bg-[#25D366] hover:bg-[#1fb355] text-white shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                <a
                  href="https://wa.me/34630039090?text=Hi,%20I%20have%20a%20question%20about%20Costa%20del%20Sol%20properties"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t.whatsappContact}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
