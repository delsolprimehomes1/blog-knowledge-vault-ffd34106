import { z } from "zod";

export const agentFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["agent", "admin"]),
  languages: z.array(z.string()).min(1, "At least one language is required"),
  max_active_leads: z.number().min(1).max(200).default(50),
  email_notifications: z.boolean().default(true),
  timezone: z.string().default("Europe/Madrid"),
});

export const editAgentFormSchema = agentFormSchema.omit({ password: true }).extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export type AgentFormData = z.infer<typeof agentFormSchema>;
export type EditAgentFormData = z.infer<typeof editAgentFormSchema>;

export const SUPPORTED_LANGUAGES = [
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "hu", name: "Hungarian", flag: "🇭🇺" },
] as const;

export const TIMEZONES = [
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/London",
  "Europe/Helsinki",
  "Europe/Warsaw",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/Stockholm",
  "Europe/Copenhagen",
  "Europe/Budapest",
] as const;

export const getLanguageFlag = (code: string): string => {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang?.flag || "🌐";
};

export const getLanguageName = (code: string): string => {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang?.name || code;
};
