import { useState } from "react";
import { motion } from "framer-motion";
import { Play, X, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";
import { getWelcomeBackVideoUrl, RETARGETING_VIDEO_THUMBNAIL } from "@/config/retargetingWelcomeBackVideos";

interface RetargetingAutoplayVideoProps {
  language?: string;
}

export const RetargetingAutoplayVideo = ({ language = "en" }: RetargetingAutoplayVideoProps) => {
  const t = getRetargetingTranslations(language);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoUrl = getWelcomeBackVideoUrl(language);

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  const handleCloseClick = () => {
    setIsPlaying(false);
  };

  const handleEmmaClick = () => {
    window.dispatchEvent(new CustomEvent("openEmmaChat"));
  };

  return (
    <section className="relative bg-gradient-to-br from-[#faf9f7] via-white to-[#faf9f7] py-20 md:py-28 overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-landing-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-landing-navy/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-landing-gold text-sm tracking-widest uppercase mb-3">
            {t.videoSoftLine}
          </p>
          <h2 className="text-2xl md:text-[32px] lg:text-[40px] font-serif text-landing-navy leading-snug">
            {t.videoHeadline}
          </h2>
        </motion.div>

        {/* Video Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7 }}
          className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-landing-navy/5"
        >
          {!isPlaying ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={RETARGETING_VIDEO_THUMBNAIL}
                alt="Video thumbnail"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-landing-navy/30 to-black/20" />
              <button
                onClick={handlePlayClick}
                className="group relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-landing-gold rounded-full hover:bg-landing-goldDark transition-all duration-300 hover:scale-110 shadow-2xl z-10"
                aria-label="Play video"
              >
                <Play size={36} className="text-white ml-2" fill="white" />
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video
                src={videoUrl || undefined}
                controls
                autoPlay
                className="w-full h-full"
                controlsList="nodownload"
                playsInline
              >
                Your browser does not support the video tag.
              </video>
              <button
                onClick={handleCloseClick}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors z-20"
                aria-label="Close video"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Bullet Points */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 grid md:grid-cols-3 gap-4"
        >
          {t.videoBullets.map((bullet, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50"
            >
              <div className="w-5 h-5 rounded-full bg-landing-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-landing-gold" />
              </div>
              <p className="text-landing-navy text-sm leading-relaxed">{bullet}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 text-center"
        >
          <Button
            onClick={handleEmmaClick}
            className="bg-gradient-to-r from-landing-gold to-[#d4b563] hover:from-[#b8994f] hover:to-landing-gold text-white px-8 py-6 text-base font-medium rounded-xl transition-all duration-300 shadow-[0_10px_40px_rgba(196,160,83,0.3)] hover:shadow-[0_15px_50px_rgba(196,160,83,0.4)] hover:scale-[1.02]"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t.videoCtaButton}
          </Button>
          <p className="mt-4 text-landing-navy/50 text-sm">
            {t.videoReassurance}
          </p>
        </motion.div>
      </div>
    </section>
  );
};
