import { Link } from "react-router-dom";
import {
  RetargetingHero,
  RetargetingIntro,
  RetargetingVisualContext,
  RetargetingTestimonials,
  RetargetingPositioning,
  RetargetingProjects,
  RetargetingForm,
  RetargetingFooter,
} from "@/components/retargeting";

const RetargetingLanding = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header - Just Logo */}
      <header className="absolute top-0 left-0 right-0 z-50 py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <Link to="/en" className="inline-block">
            <span className="text-[#1a1f2e] text-lg md:text-xl tracking-widest font-light">
              DEL
              <span className="text-[#c9a962]">SOL</span>
              PRIMEHOMES
            </span>
          </Link>
        </div>
      </header>

      {/* Page Sections */}
      <RetargetingHero />
      <RetargetingIntro />
      <RetargetingVisualContext />
      <RetargetingTestimonials />
      <RetargetingPositioning />
      <RetargetingProjects />
      <RetargetingForm />
      <RetargetingFooter />
    </div>
  );
};

export default RetargetingLanding;
