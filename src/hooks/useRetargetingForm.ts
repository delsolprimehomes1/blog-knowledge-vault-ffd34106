import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerCrmLead } from "@/utils/crm/registerCrmLead";

interface FormData {
  firstName: string;
  email: string;
  question: string;
  phone?: string;
}

interface UseRetargetingFormReturn {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
  submitForm: (data: FormData) => Promise<void>;
  reset: () => void;
}

export const useRetargetingForm = (language: string = "en"): UseRetargetingFormReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract UTM parameters from URL
  const getUtmParams = () => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
    };
  };

  const submitForm = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const utmParams = getUtmParams();

      const { error: submitError } = await supabase
        .from("retargeting_leads")
        .insert({
          first_name: data.firstName || null,
          email: data.email || null,
          question: data.question || null,
          phone: data.phone || null,
          language: language,
          source_url: typeof window !== "undefined" ? window.location.href : null,
          ...utmParams,
        });

      if (submitError) throw submitError;

      // Parse full name into first/last for CRM
      const nameParts = (data.firstName || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Register in CRM for round-robin routing (non-blocking)
      await registerCrmLead({
        firstName,
        lastName,
        phone: data.phone || "",
        leadSource: "Landing Form",
        leadSourceDetail: `retargeting_welcome_back_${language}`,
        pageType: "retargeting",
        pageUrl: typeof window !== "undefined" ? window.location.href : "",
        pageTitle: typeof window !== "undefined" ? document.title : "",
        language: language,
        interest: data.question || "Not specified",
        message: data.question,
        referrer: typeof window !== "undefined" ? document.referrer : "",
      });

      setIsSuccess(true);
    } catch (err) {
      console.error("Form submission error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setIsSuccess(false);
    setError(null);
  };

  return {
    isSubmitting,
    isSuccess,
    error,
    submitForm,
    reset,
  };
};
