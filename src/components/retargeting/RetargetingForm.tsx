import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle } from "lucide-react";
import { useRetargetingForm } from "@/hooks/useRetargetingForm";

export const RetargetingForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    question: "",
  });

  const { isSubmitting, isSuccess, error, submitForm } = useRetargetingForm("en");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;
    await submitForm(formData);
  };

  return (
    <section className="relative bg-gradient-to-br from-[#faf9f7] via-white to-[#faf9f7] py-20 md:py-24 lg:py-28 overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-landing-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-landing-navy/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-[500px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-medium text-landing-navy mb-3">
              Receive written information if and when you want it.
            </h2>
            <p className="text-landing-navy/60 text-sm md:text-base">
              No obligation. No next step implied.
            </p>
          </div>

          {/* Form or Success Message */}
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 text-center shadow-xl border border-white/50"
            >
              <div className="w-14 h-14 bg-landing-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <Check className="w-7 h-7 text-landing-gold" />
                </motion.div>
              </div>
              <p className="text-landing-navy text-lg font-medium">
                Thank you.
              </p>
              <p className="text-landing-navy/60 mt-2">
                We'll send you information shortly.
              </p>
            </motion.div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* First Name - Optional */}
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-landing-navy mb-2"
                  >
                    First name
                  </label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Your first name"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="bg-white/50 border-gray-200 rounded-xl focus:border-landing-gold focus:ring-landing-gold/20 transition-all"
                  />
                </div>

                {/* Email - Required */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-landing-navy mb-2"
                  >
                    Email <span className="text-landing-gold">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="bg-white/50 border-gray-200 rounded-xl focus:border-landing-gold focus:ring-landing-gold/20 transition-all"
                  />
                </div>

                {/* Question - Optional */}
                <div>
                  <label
                    htmlFor="question"
                    className="block text-sm font-medium text-landing-navy mb-2"
                  >
                    What would you like to understand better?
                  </label>
                  <Textarea
                    id="question"
                    placeholder="Optional — tell us what's on your mind"
                    rows={4}
                    value={formData.question}
                    onChange={(e) =>
                      setFormData({ ...formData, question: e.target.value })
                    }
                    className="bg-white/50 border-gray-200 rounded-xl focus:border-landing-gold focus:ring-landing-gold/20 resize-none transition-all"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="text-center pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.email}
                    className="bg-gradient-to-r from-landing-gold to-[#d4b563] hover:from-[#b8994f] hover:to-landing-gold text-white px-8 py-5 text-base font-medium rounded-xl transition-all duration-300 shadow-[0_8px_30px_rgba(196,160,83,0.25)] hover:shadow-[0_12px_40px_rgba(196,160,83,0.35)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSubmitting ? "Sending..." : "Request information"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};
