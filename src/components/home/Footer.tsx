import React from 'react';
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-prime-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-prime-gold rounded-lg flex items-center justify-center">
                <span className="text-prime-950 font-bold text-xl">D</span>
              </div>
              <span className="font-serif font-bold text-xl text-white">DelSolPrimeHomes</span>
            </div>
            <p className="text-sm leading-relaxed mb-6">
              Premium new-build and off-plan real estate specialists on the Costa del Sol. API-accredited, multilingual guidance.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-prime-gold transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="hover:text-prime-gold transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="hover:text-prime-gold transition-colors"><Linkedin className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/property-finder" className="hover:text-prime-gold transition-colors">Property Finder</a></li>
              <li><a href="/areas" className="hover:text-prime-gold transition-colors">Areas We Cover</a></li>
              <li><a href="/about" className="hover:text-prime-gold transition-colors">About Us</a></li>
              <li><a href="/buyers-guide" className="hover:text-prime-gold transition-colors">Buyers Guide</a></li>
              <li><a href="/blog" className="hover:text-prime-gold transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4">Our Services</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-prime-gold transition-colors">New Build Properties</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors">Off-Plan Developments</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors">Legal Assistance</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors">After-Sales Support</a></li>
              <li><a href="#" className="hover:text-prime-gold transition-colors">Golden Visa</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-prime-gold flex-shrink-0 mt-0.5" />
                <span>Av. Ricardo Soriano<br />Marbella, 29601<br />Spain</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-prime-gold flex-shrink-0" />
                <a href="tel:+34123456789" className="hover:text-prime-gold transition-colors">+34 123 456 789</a>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-prime-gold flex-shrink-0" />
                <a href="mailto:info@delsolprimehomes.com" className="hover:text-prime-gold transition-colors">info@delsolprimehomes.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} DelSolPrimeHomes. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" className="hover:text-prime-gold transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-prime-gold transition-colors">Terms of Service</a>
            <a href="/cookies" className="hover:text-prime-gold transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};