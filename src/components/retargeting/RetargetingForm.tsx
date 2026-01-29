import { useState } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRetargetingForm } from "@/hooks/useRetargetingForm";
import { getLandingFormTranslations } from "@/lib/landingFormTranslations";

const formSchema = z.object({
  fullName: z.string().min(2, "Name is too short").max(100),
  phone: z.string().min(6, "Phone number is required"),
  interest: z.string().optional(),
  consent: z.boolean().refine((val) => val === true, {
    message: "You must agree to continue",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface RetargetingFormProps {
  language?: string;
}

export const RetargetingForm = ({ language = "en" }: RetargetingFormProps) => {
  const t = getLandingFormTranslations(language);
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [interestValue, setInterestValue] = useState<string>("both");
  const [consentValue, setConsentValue] = useState<boolean>(false);

  const { isSubmitting, isSuccess, error, submitForm } = useRetargetingForm(language);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      interest: "both",
      consent: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    await submitForm({
      firstName: data.fullName,
      email: "",
      question: `Interest: ${data.interest || "Not specified"}`,
      phone: data.phone,
    });
  };

  const handlePhoneChange = (value: string | undefined) => {
    const phoneVal = value || "";
    setPhoneValue(phoneVal);
    setValue("phone", phoneVal, { shouldValidate: true });
  };

  const handleInterestChange = (value: string) => {
    setInterestValue(value);
    setValue("interest", value, { shouldValidate: true });
  };

  const handleConsentChange = () => {
    const newValue = !consentValue;
    setConsentValue(newValue);
    setValue("consent", newValue, { shouldValidate: true });
  };

  return (
    <section className="relative bg-gradient-to-br from-[#faf9f7] via-white to-[#faf9f7] py-20 md:py-24 lg:py-28 overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-landing-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-landing-navy/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-md mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          {/* Form or Success Message */}
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 text-center shadow-lg border border-gray-100"
            >
              <div className="w-16 h-16 bg-[#D4A853] rounded-full flex items-center justify-center mx-auto mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <Check className="w-8 h-8 text-white" strokeWidth={3} />
                </motion.div>
              </div>
              <p className="text-gray-900 text-xl font-semibold mb-2">
                {t.success}
              </p>
              <p className="text-gray-600">
                {t.successSubtext}
              </p>
            </motion.div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 sm:p-8">
                {/* Headline */}
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">
                  {t.headline}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t.fullName} <span className="text-gray-400">*</span>
                    </label>
                    <input
                      {...register("fullName")}
                      type="text"
                      placeholder={t.fullNamePlaceholder}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853] transition-all"
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>
                    )}
                  </div>

                  {/* Phone / WhatsApp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t.phone} <span className="text-gray-400">*</span>
                    </label>
                    <PhoneInput
                      international
                      defaultCountry="ES"
                      value={phoneValue}
                      onChange={handlePhoneChange}
                      className="landing-form-phone-input"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* Interest Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t.interestedIn}
                    </label>
                    <Select value={interestValue} onValueChange={handleInterestChange}>
                      <SelectTrigger className="w-full px-4 py-3 h-auto rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                        <SelectItem value="both" className="cursor-pointer hover:bg-gray-50">
                          {t.interestOptions.both}
                        </SelectItem>
                        <SelectItem value="buying" className="cursor-pointer hover:bg-gray-50">
                          {t.interestOptions.buying}
                        </SelectItem>
                        <SelectItem value="renting" className="cursor-pointer hover:bg-gray-50">
                          {t.interestOptions.renting}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Consent Checkbox - Circular Style */}
                  <div className="flex items-start gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleConsentChange}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                        consentValue
                          ? "bg-[#D4A853] border-[#D4A853]"
                          : "border-gray-300 bg-white hover:border-gray-400"
                      }`}
                      aria-checked={consentValue}
                      role="checkbox"
                    >
                      {consentValue && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </button>
                    <label
                      onClick={handleConsentChange}
                      className="text-sm text-gray-600 cursor-pointer leading-relaxed"
                    >
                      {t.consent}
                    </label>
                  </div>
                  {errors.consent && (
                    <p className="text-red-500 text-xs -mt-2">{errors.consent.message}</p>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#D4A853] hover:bg-[#C49843] text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {t.submitting}
                      </span>
                    ) : (
                      t.submit
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};
