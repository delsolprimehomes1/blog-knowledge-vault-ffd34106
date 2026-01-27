import { Link } from "react-router-dom";

export const RetargetingFooter = () => {
  return (
    <footer className="bg-[#1a1f2e] py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-6">
            <span className="text-white text-xl md:text-2xl tracking-widest font-light">
              DEL
              <span className="text-[#c9a962]">SOL</span>
              PRIMEHOMES
            </span>
          </div>
          
          {/* Copyright */}
          <p className="text-white/70 text-sm mb-4">
            © 2026 Del Sol Prime Homes
          </p>
          
          {/* Legal Links */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link
              to="/privacy"
              className="text-white/60 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-white/60 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
