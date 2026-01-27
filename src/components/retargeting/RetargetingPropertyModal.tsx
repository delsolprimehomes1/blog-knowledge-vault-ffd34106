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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { registerCrmLead } from "@/utils/crm/registerCrmLead";

const formSchema = z.object({
  fullName: z.string().min(2, "Name is too short").max(100),
  whatsapp: z.string().min(6, "Phone number is required"),
  questions: z.string().max(1000).optional(),
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
}

const formatPrice = (price: number | null): string => {
  if (!price) return "Price on request";
  try {
    return new Intl.NumberFormat("en-EU", {
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
}: RetargetingPropertyModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappValue, setWhatsappValue] = useState<string>("");

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
      whatsapp: "",
      questions: "",
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setWhatsappValue("");
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
        phone: data.whatsapp,
        leadSource: "Property Inquiry",
        leadSourceDetail: "retargeting_property_card_en",
        pageType: "retargeting",
        pageUrl: window.location.href,
        pageTitle: document.title,
        language: "en",
        propertyRef: property.id,
        propertyPrice: property.price_eur ?? undefined,
        propertyType: "Property Card",
        interest: `${property.internal_name} - ${property.location}`,
        message: data.questions,
        referrer: document.referrer,
      });

      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting inquiry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsappChange = (value: string | undefined) => {
    const phoneValue = value || "";
    setWhatsappValue(phoneValue);
    setValue("whatsapp", phoneValue, { shouldValidate: true });
  };

  if (!property) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-2xl p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-16 px-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-landing-gold to-landing-gold/80 flex items-center justify-center mb-6 shadow-lg"
              >
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </motion.div>
              <h3 className="text-2xl font-semibold text-landing-navy mb-2">
                Thank You!
              </h3>
              <p className="text-landing-navy/70 text-center">
                We've received your inquiry about{" "}
                <span className="font-medium">{property.internal_name}</span>.
                <br />
                Our team will contact you shortly.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader className="p-6 pb-4">
                <DialogTitle className="text-xl font-semibold text-landing-navy">
                  Inquire About This Property
                </DialogTitle>
              </DialogHeader>

              {/* Property Context Card */}
              <div className="mx-6 mb-4 p-4 bg-gradient-to-br from-landing-navy/5 to-landing-gold/5 rounded-xl border border-landing-gold/10">
                <h4 className="font-medium text-landing-navy text-lg mb-1">
                  {property.internal_name}
                </h4>
                <div className="flex items-center gap-1.5 text-landing-navy/60 text-sm mb-2">
                  <MapPin size={14} />
                  <span>{property.location}</span>
                </div>
                <div className="inline-block bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="text-landing-navy font-semibold">
                    {formatPrice(property.price_eur)}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6">
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-landing-navy/80 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      {...register("fullName")}
                      type="text"
                      placeholder="John Smith"
                      className="w-full px-4 py-3 rounded-xl border border-landing-navy/10 bg-white/80 text-landing-navy placeholder:text-landing-navy/40 focus:outline-none focus:ring-2 focus:ring-landing-gold/50 focus:border-landing-gold/30 transition-all"
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp Number */}
                  <div>
                    <label className="block text-sm font-medium text-landing-navy/80 mb-1.5">
                      WhatsApp Number *
                    </label>
                    <PhoneInput
                      international
                      defaultCountry="ES"
                      value={whatsappValue}
                      onChange={handleWhatsappChange}
                      className="retargeting-phone-input w-full px-4 py-3 rounded-xl border border-landing-navy/10 bg-white/80 text-landing-navy focus-within:ring-2 focus-within:ring-landing-gold/50 focus-within:border-landing-gold/30 transition-all"
                    />
                    {errors.whatsapp && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.whatsapp.message}
                      </p>
                    )}
                  </div>

                  {/* Questions */}
                  <div>
                    <label className="block text-sm font-medium text-landing-navy/80 mb-1.5">
                      Your Questions (Optional)
                    </label>
                    <textarea
                      {...register("questions")}
                      rows={3}
                      placeholder="Any specific questions about this property?"
                      className="w-full px-4 py-3 rounded-xl border border-landing-navy/10 bg-white/80 text-landing-navy placeholder:text-landing-navy/40 focus:outline-none focus:ring-2 focus:ring-landing-gold/50 focus:border-landing-gold/30 transition-all resize-none"
                    />
                    {errors.questions && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.questions.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 py-4 px-6 rounded-xl bg-gradient-to-r from-landing-gold to-landing-gold/90 text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:shadow-landing-gold/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
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
                      Sending...
                    </span>
                  ) : (
                    "Send Inquiry"
                  )}
                </button>

                <p className="text-xs text-landing-navy/50 text-center mt-4">
                  By submitting, you agree to be contacted about this property.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
