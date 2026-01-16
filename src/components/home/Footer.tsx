import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const Footer: React.FC = () => {
  const { t, currentLanguage } = useTranslation();
  
  return (
    <footer className="bg-prime-900 text-white pt-20 pb-10 border-t-4 border-prime-gold">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div>
            <div className="mb-6">
              <img 
                src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png" 
                alt="DelSolPrimeHomes" 
                className="h-14 md:h-20 w-auto object-contain"
              />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {t.footer.brandDescription}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-prime-gold hover:text-prime-900 transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-prime-gold hover:text-prime-900 transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-prime-gold hover:text-prime-900 transition-colors">
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
             <h4 className="font-serif font-bold text-lg mb-6 text-white">{t.footer.contactHeading}</h4>
             <ul className="space-y-4 text-slate-300 text-sm">
                <li className="flex gap-3">
                  <MapPin size={18} className="text-prime-gold shrink-0" />
                  <span>{t.footer.address}</span>
                </li>
                <li className="flex gap-3">
                  <Phone size={18} className="text-prime-gold shrink-0" />
                  <span>+34 952 000 000</span>
                </li>
                <li className="flex gap-3">
                  <Mail size={18} className="text-prime-gold shrink-0" />
                  <span>info@delsolprimehomes.com</span>
                </li>
             </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-bold text-lg mb-6 text-white">{t.footer.navigateHeading}</h4>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li><Link to={`/${currentLanguage}/properties`} className="hover:text-prime-gold transition-colors font-nav">{t.footer.links.propertyFinder}</Link></li>
              <li><Link to={`/${currentLanguage}/locations`} className="hover:text-prime-gold transition-colors font-nav">{t.footer.links.featuredAreas}</Link></li>
              <li><Link to="/about" className="hover:text-prime-gold transition-colors font-nav">{t.footer.links.ourTeam}</Link></li>
              <li><Link to={`/${currentLanguage}/buyers-guide`} className="hover:text-prime-gold transition-colors font-nav">{t.footer.links.buyersGuide}</Link></li>
              <li><Link to={`/${currentLanguage}/blog`} className="hover:text-prime-gold transition-colors font-nav">{t.footer.links.blogInsights}</Link></li>
              <li><Link to={`/${currentLanguage}/glossary`} className="hover:text-prime-gold transition-colors font-nav">{t.footer.links.glossary || "Property Glossary"}</Link></li>
              <li><Link to={`/${currentLanguage}/compare`} className="hover:text-prime-gold transition-colors font-nav">{t.footer.links.comparisons || "Comparisons"}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-serif font-bold text-lg mb-6 text-white">{t.footer.legalHeading}</h4>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li><Link to="/privacy" className="hover:text-prime-gold transition-colors font-nav">{t.footer.legal.privacy}</Link></li>
              <li><Link to="/terms" className="hover:text-prime-gold transition-colors font-nav">{t.footer.legal.terms || "Terms of Service"}</Link></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">{t.footer.legal.cookies}</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">{t.footer.legal.legalNotice}</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">{t.footer.legal.gdpr}</a></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">
            {t.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">{t.footer.tagline}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
