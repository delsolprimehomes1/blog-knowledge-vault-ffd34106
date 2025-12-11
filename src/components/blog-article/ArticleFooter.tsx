import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const COMPANY_INFO = {
  name: "Del Sol Prime Homes",
  tagline: "Premium real estate agency specializing in Costa del Sol properties",
  phone: "+34 613 578 416",
  email: "info@delsolprimehomes.com",
  website: "https://www.delsolprimehomes.com",
  address: {
    street: "Calle Águila Real 8, Bajo C",
    city: "Mijas",
    postalCode: "29649",
    country: "Spain"
  },
  serviceAreas: ["Marbella", "Estepona", "Fuengirola", "Benalmádena", "Mijas", "Sotogrande", "Casares", "Torremolinos", "Manilva"],
  languages: ["English", "German", "Dutch", "French", "Polish", "Finnish", "Swedish", "Danish", "Norwegian", "Hungarian"]
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
              <a 
                href={COMPANY_INFO.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <MapPin className="h-4 w-4" />
                <span>{COMPANY_INFO.website.replace('https://', '')}</span>
              </a>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <address className="not-italic">
                  {COMPANY_INFO.address.street}<br />
                  {COMPANY_INFO.address.postalCode} {COMPANY_INFO.address.city}<br />
                  {COMPANY_INFO.address.country}
                </address>
              </div>
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
