import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { Language } from '../../types/home';

export const Footer: React.FC = () => {
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
              DelSolPrimeHomes — New-build and off-plan specialists on the Costa del Sol, serving clients in 10 languages.
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
             <h4 className="font-serif font-bold text-lg mb-6 text-white">Contact Us</h4>
             <ul className="space-y-4 text-slate-300 text-sm">
                <li className="flex gap-3">
                  <MapPin size={18} className="text-prime-gold shrink-0" />
                  <span>Av. Ricardo Soriano, Marbella, <br/>29601, Spain</span>
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
            <h4 className="font-serif font-bold text-lg mb-6 text-white">Navigate</h4>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">Property Finder</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">Featured Areas</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">Our Team</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">Buyers Guide</a></li>
              <li><Link to="/blog" className="hover:text-prime-gold transition-colors font-nav">Blog & Insights</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-serif font-bold text-lg mb-6 text-white">Legal</h4>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">Legal Notice</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">LPO Information</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors font-nav">GDPR Compliance</a></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} DelSolPrimeHomes. All rights reserved. API Registered.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Made for Excellence</span>
          </div>
        </div>
      </div>
    </footer>
  );
};