import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { registerCrmLead } from "@/utils/crm/registerCrmLead";

export type ChatStep = "initial" | "property_type" | "budget" | "area" | "contact_form" | "complete";

interface Message {
  text: string;
  isBot: boolean;
  timestamp: Date;
  quickReplies?: Array<{ label: string; value: string }>;
}

interface CollectedData {
  propertyType?: string;
  budget?: string;
  area?: string;
}

export interface ChatbotHook {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: (text: string) => void;
  handleQuickReply: (value: string) => void;
  submitContactForm: (data: { name: string; email: string; phone: string; language: string }) => void;
  currentStep: ChatStep;
  language: string;
}

const TRANSLATIONS = {
  en: {
    greeting: "👋 Hello! I'm here to help you find your dream property in Costa del Sol.\n\nWhat would you like help with?",
    scheduleViewing: "📅 Schedule a viewing",
    discussFinancing: "💰 Discuss financing",
    learnAbout: "📍 Learn about areas",
    askQuestion: "❓ Ask a question",
    propertyTypeQ: "Great! Let me collect some details.\n\nWhat's your preferred property type?",
    budgetQ: "What's your budget range?",
    areaQ: "Which area interests you most?",
    confirmation: "✅ Thank you! Our team will contact you within 24 hours to schedule your viewing. You'll receive a confirmation email shortly.",
  },
  es: {
    greeting: "👋 ¡Hola! Estoy aquí para ayudarte a encontrar tu propiedad de ensueño en Costa del Sol.\n\n¿En qué te puedo ayudar?",
    scheduleViewing: "📅 Programar una visita",
    discussFinancing: "💰 Discutir financiación",
    learnAbout: "📍 Conocer sobre zonas",
    askQuestion: "❓ Hacer una pregunta",
    propertyTypeQ: "¡Genial! Permíteme recopilar algunos detalles.\n\n¿Cuál es tu tipo de propiedad preferido?",
    budgetQ: "¿Cuál es tu rango de presupuesto?",
    areaQ: "¿Qué zona te interesa más?",
    confirmation: "✅ ¡Gracias! Nuestro equipo se pondrá en contacto contigo en 24 horas para programar tu visita. Recibirás un correo de confirmación pronto.",
  },
};

export const useChatbot = (articleSlug: string, language: string): ChatbotHook => {
  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  const [messages, setMessages] = useState<Message[]>([
    {
      text: t.greeting,
      isBot: true,
      timestamp: new Date(),
      quickReplies: [
        { label: t.scheduleViewing, value: "schedule" },
        { label: t.discussFinancing, value: "financing" },
        { label: t.learnAbout, value: "areas" },
        { label: t.askQuestion, value: "question" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [currentStep, setCurrentStep] = useState<ChatStep>("initial");
  const [collectedData, setCollectedData] = useState<CollectedData>({});

  const addMessage = (text: string, isBot: boolean, quickReplies?: Array<{ label: string; value: string }>) => {
    setMessages((prev) => [...prev, { text, isBot, timestamp: new Date(), quickReplies }]);
  };

  const sendMessage = (text: string) => {
    addMessage(text, false);
    setInput("");
  };

  const handleQuickReply = (value: string) => {
    addMessage(value, false);

    switch (currentStep) {
      case "initial":
        if (value === "schedule") {
          setCurrentStep("property_type");
          addMessage(t.propertyTypeQ, true, [
            { label: "🏡 Villa", value: "villa" },
            { label: "🏢 Apartment/Penthouse", value: "apartment" },
            { label: "🏖️ Beachfront", value: "beachfront" },
            { label: "🏌️ Golf property", value: "golf" },
          ]);
        }
        break;

      case "property_type":
        setCollectedData((prev) => ({ ...prev, propertyType: value }));
        setCurrentStep("budget");
        addMessage(t.budgetQ, true, [
          { label: "€500K - €1M", value: "500k-1m" },
          { label: "€1M - €2M", value: "1m-2m" },
          { label: "€2M - €5M", value: "2m-5m" },
          { label: "€5M+", value: "5m+" },
        ]);
        break;

      case "budget":
        setCollectedData((prev) => ({ ...prev, budget: value }));
        setCurrentStep("area");
        addMessage(t.areaQ, true, [
          { label: "Marbella", value: "marbella" },
          { label: "Estepona", value: "estepona" },
          { label: "Fuengirola", value: "fuengirola" },
          { label: "Other", value: "other" },
        ]);
        break;

      case "area":
        setCollectedData((prev) => ({ ...prev, area: value }));
        setCurrentStep("contact_form");
        break;
    }
  };

  const submitContactForm = async (data: { name: string; email: string; phone: string; language: string }) => {
    try {
      const conversationTranscript = messages.map((m) => ({
        text: m.text,
        isBot: m.isBot,
        timestamp: m.timestamp.toISOString(),
      }));

      const { error } = await supabase.from("chatbot_conversations").insert({
        user_name: data.name,
        user_email: data.email,
        user_phone: data.phone,
        preferred_language: data.language,
        property_type: collectedData.propertyType,
        budget_range: collectedData.budget,
        area: collectedData.area,
        conversation_transcript: conversationTranscript,
        article_slug: articleSlug,
      });

      if (error) throw error;

      // Parse full name for CRM
      const nameParts = data.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Build conversation summary for CRM message
      const conversationSummary = [
        collectedData.propertyType ? `Property Type: ${collectedData.propertyType}` : null,
        collectedData.budget ? `Budget: ${collectedData.budget}` : null,
        collectedData.area ? `Area: ${collectedData.area}` : null,
      ].filter(Boolean).join(' | ');

      // Register with CRM for proper lead routing and admin notifications
      await registerCrmLead({
        firstName,
        lastName,
        email: data.email,
        phone: data.phone,
        leadSource: 'Emma Chatbot',
        leadSourceDetail: `chatbot_embedded_${articleSlug}_${language}`,
        pageType: 'blog_article',
        pageUrl: window.location.href,
        pageTitle: document.title,
        language: language,
        referrer: document.referrer || undefined,
        propertyType: collectedData.propertyType,
        interest: conversationSummary || `Chatbot inquiry from ${articleSlug}`,
        message: `Chatbot conversation completed. Budget: ${collectedData.budget || 'Not specified'}. ${conversationSummary}`,
      });

      setCurrentStep("complete");
      addMessage(t.confirmation, true);
      toast.success("Booking submitted successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit booking. Please try again.");
    }
  };

  return {
    messages,
    input,
    setInput,
    sendMessage,
    handleQuickReply,
    submitContactForm,
    currentStep,
    language,
  };
};
