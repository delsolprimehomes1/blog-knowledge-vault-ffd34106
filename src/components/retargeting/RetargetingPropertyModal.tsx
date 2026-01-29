import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, MapPin, X } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerCrmLead } from "@/utils/crm/registerCrmLead";
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

interface RetargetingPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    internal_name: string;
    location: string;
    price_eur: number | null;
  } | null;
  language?: string;
}

const formatPrice = (price: number | null, priceOnRequest: string): string => {
  if (!price) return priceOnRequest;
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `€${price.toLocaleString()}`;
  }
};

export const RetargetingPropertyModal = ({
  isOpen,
  onClose,
  property,
  language = "en",
}: RetargetingPropertyModalProps) => {
  const t = getLandingFormTranslations(language);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [interestValue, setInterestValue] = useState<string>("both");
  const [consentValue, setConsentValue] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setPhoneValue("");
      setInterestValue("both");
      setConsentValue(false);
      setIsSuccess(false);
    }
  }, [isOpen, reset]);

  // Auto-close after success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  const onSubmit = async (data: FormData) => {
    if (!property) return;

    setIsSubmitting(true);

    try {
      // Split name into first and last
      const nameParts = data.fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Register lead in CRM
      await registerCrmLead({
        firstName,
        lastName,
        phone: data.phone,
        leadSource: "Property Inquiry",
        leadSourceDetail: `retargeting_property_card_${language}`,
        pageType: "retargeting",
        pageUrl: window.location.href,
        pageTitle: document.title,
        language: language,
        propertyRef: property.id,
        propertyPrice: property.price_eur ?? undefined,
        propertyType: "Property Card",
        interest: `${property.internal_name} - ${data.interest || "both"}`,
        referrer: document.referrer,
      });

      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting inquiry:", error);
    } finally {
      setIsSubmitting(false);
    }
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

  if (!property) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-white border-0 shadow-2xl rounded-2xl p-0 overflow-hidden [&>button]:hidden">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-12 px-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-[#D4A853] flex items-center justify-center mb-4 shadow-lg"
              >
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t.success}
              </h3>
              <p className="text-gray-600 text-center">{t.successSubtext}</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <div className="p-6 sm:p-8">
                {/* Headline */}
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6 pr-8">
                  {t.headline}
                </h2>

                {/* Property Info Box */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-base mb-1">
                    {property.internal_name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
                    <MapPin size={14} />
                    <span className="uppercase tracking-wide">{property.location}</span>
                  </div>
                  <span className="inline-block bg-gray-800 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                    {formatPrice(property.price_eur, t.priceOnRequest)}
                  </span>
                </div>

                {/* Form */}
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
                      <p className="text-red-500 text-xs mt-1">
                        {errors.fullName.message}
                      </p>
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
                      <p className="text-red-500 text-xs mt-1">
                        {errors.phone.message}
                      </p>
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
                    <p className="text-red-500 text-xs -mt-2">
                      {errors.consent.message}
                    </p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#D4A853] hover:bg-[#C49843] text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
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
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
