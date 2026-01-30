import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, CheckCircle } from "lucide-react";
import { registerCrmLead } from "@/utils/crm/registerCrmLead";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface TeamMemberContactFormProps {
  memberName: string;
}

// Helper to parse full name into first and last name
function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

export const TeamMemberContactForm = ({ memberName }: TeamMemberContactFormProps) => {
  const { t, currentLanguage } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Save to leads table with required phone field
      const { error } = await supabase.from('leads').insert([{
        full_name: data.name,
        email: data.email,
        phone: '', // Required field
        comment: `Message for ${memberName}: ${data.message}`,
        language: currentLanguage,
        source: 'team_page',
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      }]);

      if (error) throw error;

      // Register with CRM for proper lead routing and admin notifications
      const { firstName, lastName } = parseFullName(data.name);
      await registerCrmLead({
        firstName,
        lastName,
        email: data.email,
        phone: '', // No phone from this form
        leadSource: 'Website Form',
        leadSourceDetail: `team_member_contact_${memberName.toLowerCase().replace(/\s+/g, '_')}_${currentLanguage}`,
        pageType: 'team_page',
        pageUrl: window.location.href,
        pageTitle: document.title,
        language: currentLanguage,
        referrer: document.referrer || undefined,
        interest: `Contact request for team member: ${memberName}`,
        message: data.message,
      });

      // Track event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'generate_lead', {
          event_category: 'Team',
          event_label: memberName,
          value: 1
        });
      }

      setIsSubmitted(true);
      reset();
      toast.success(t.team?.form?.success || "Message sent successfully!");

    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(t.team?.form?.error || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-6 bg-green-50 rounded-lg">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h4 className="font-semibold text-green-800 mb-2">
          {t.team?.form?.successTitle || "Message Sent!"}
        </h4>
        <p className="text-sm text-green-700">
          {t.team?.form?.successDescription || `${memberName} will get back to you soon.`}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Send className="w-4 h-4 text-prime-gold" />
        {t.team?.modal?.sendMessage || "Send a Message"}
      </h3>

      <div>
        <Label htmlFor="name">{t.team?.form?.name || "Your Name"}</Label>
        <Input
          id="name"
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">{t.team?.form?.email || "Email Address"}</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="message">{t.team?.form?.message || "Your Message"}</Label>
        <Textarea
          id="message"
          rows={3}
          {...register("message")}
          className={errors.message ? "border-destructive" : ""}
          placeholder={t.team?.form?.messagePlaceholder || `How can ${memberName} help you?`}
        />
        {errors.message && (
          <p className="text-xs text-destructive mt-1">{errors.message.message}</p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full bg-prime-gold hover:bg-prime-gold/90 text-prime-900"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-prime-900/30 border-t-prime-900 rounded-full animate-spin mr-2" />
            {t.team?.form?.sending || "Sending..."}
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            {t.team?.form?.submit || "Send Message"}
          </>
        )}
      </Button>
    </form>
  );
};
