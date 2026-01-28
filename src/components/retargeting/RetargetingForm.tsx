import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle } from "lucide-react";
import { useRetargetingForm } from "@/hooks/useRetargetingForm";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface RetargetingFormProps {
  language?: string;
}

export const RetargetingForm = ({ language = "en" }: RetargetingFormProps) => {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    interest: "",
    consent: false,
  });

  const t = getRetargetingTranslations(language);
  const { isSubmitting, isSuccess, error, submitForm } = useRetargetingForm(language);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.consent) return;
    
    await submitForm({
      firstName: formData.fullName,
      email: "",
      question: `Interest: ${formData.interest || "Not specified"}`,
      phone: formData.phone,
    });
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
            <h2 className="text-xl md:text-2xl font-serif text-landing-navy mb-3">
              {t.formTitle}
            </h2>
            <p className="text-landing-navy/60 text-sm md:text-base">
              {t.formSubtitle}
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
                {t.formSuccess}
              </p>
              <p className="text-landing-navy/60 mt-2">
                {t.formSuccessSubtext}
              </p>
            </motion.div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-landing-navy mb-2"
                  >
                    {t.formFullName} <span className="text-landing-gold">*</span>
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    required
                    placeholder={t.formFullNamePlaceholder}
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="bg-white/50 border-gray-200 rounded-xl focus:border-landing-gold focus:ring-landing-gold/20 transition-all"
                  />
                </div>

                {/* Phone / WhatsApp */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-landing-navy mb-2"
                  >
                    {t.formPhone} <span className="text-landing-gold">*</span>
                  </label>
                  <PhoneInput
                    international
                    defaultCountry="GB"
                    value={formData.phone}
                    onChange={(value) =>
                      setFormData({ ...formData, phone: value || "" })
                    }
                    className="bg-white/50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-landing-gold focus-within:ring-1 focus-within:ring-landing-gold/20 transition-all [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:text-landing-navy"
                  />
                </div>

                {/* Interest Dropdown */}
                <div>
                  <label
                    htmlFor="interest"
                    className="block text-sm font-medium text-landing-navy mb-2"
                  >
                    {t.formInterest}
                  </label>
                  <Select
                    value={formData.interest}
                    onValueChange={(value) =>
                      setFormData({ ...formData, interest: value })
                    }
                  >
                    <SelectTrigger className="bg-white/50 border-gray-200 rounded-xl focus:border-landing-gold focus:ring-landing-gold/20">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {t.formInterestOptions.map((option, index) => (
                        <SelectItem key={index} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Consent Checkbox */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={formData.consent}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, consent: checked as boolean })
                    }
                    className="mt-0.5 data-[state=checked]:bg-landing-gold data-[state=checked]:border-landing-gold"
                  />
                  <label
                    htmlFor="consent"
                    className="text-sm text-landing-navy/70 cursor-pointer leading-relaxed"
                  >
                    {t.formConsent} <span className="text-landing-gold">*</span>
                  </label>
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
                    disabled={isSubmitting || !formData.fullName || !formData.phone || !formData.consent}
                    className="w-full bg-gradient-to-r from-landing-gold to-[#d4b563] hover:from-[#b8994f] hover:to-landing-gold text-white px-8 py-5 text-base font-medium rounded-xl transition-all duration-300 shadow-[0_8px_30px_rgba(196,160,83,0.25)] hover:shadow-[0_12px_40px_rgba(196,160,83,0.35)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSubmitting ? t.formSubmitting : t.formButton}
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
