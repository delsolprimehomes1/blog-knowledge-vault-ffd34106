import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const COMPANY_INFO = {
  name: "Del Sol Prime Homes",
  tagline: "Premium real estate agency specializing in Costa del Sol properties",
  phone: "+34-XXX-XXX-XXX",
  email: "info@example.com",
  serviceAreas: ["Marbella", "Estepona", "Fuengirola", "Benalmádena", "Mijas"],
  languages: ["English", "Spanish", "German", "Dutch", "French", "Polish", "Swedish", "Danish", "Hungarian"],
  social: {
    facebook: "https://www.facebook.com/example",
    instagram: "https://www.instagram.com/example",
    linkedin: "https://www.linkedin.com/company/example"
  }
};

export const ArticleFooter = () => {
  return (
    <footer className="border-t border-border bg-muted/30 -mx-5 sm:-mx-6 px-5 sm:px-6 py-12 mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Company Branding */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {COMPANY_INFO.name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {COMPANY_INFO.tagline}
              </p>
            </div>
            
            {/* Contact Information */}
            <div className="space-y-2">
              <a 
                href={`tel:${COMPANY_INFO.phone}`}
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>{COMPANY_INFO.phone}</span>
              </a>
              <a 
                href={`mailto:${COMPANY_INFO.email}`}
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>{COMPANY_INFO.email}</span>
              </a>
            </div>

            {/* Social Media Links */}
            <div className="flex gap-3 pt-2">
              <a
                href={COMPANY_INFO.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={COMPANY_INFO.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={COMPANY_INFO.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Service Areas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-foreground">Service Areas</h4>
            </div>
            <ul className="space-y-2">
              {COMPANY_INFO.serviceAreas.map((area) => (
                <li key={area} className="text-sm text-muted-foreground">
                  {area}
                </li>
              ))}
            </ul>
          </div>

          {/* Languages & Quick Links */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-3">Available Languages</h4>
              <div className="flex flex-wrap gap-2">
                {COMPANY_INFO.languages.slice(0, 6).map((lang) => (
                  <span
                    key={lang}
                    className="px-2 py-1 text-xs bg-background text-muted-foreground rounded-md border border-border"
                  >
                    {lang}
                  </span>
                ))}
              </div>
              {COMPANY_INFO.languages.length > 6 && (
                <p className="text-xs text-muted-foreground mt-2">
                  +{COMPANY_INFO.languages.length - 6} more languages
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">Quick Links</h4>
              <nav className="space-y-2">
                <Link
                  to="/blog"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Blog Home
                </Link>
                <Link
                  to="/"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Main Website
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
