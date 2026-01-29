import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';

interface BrochureChatbotProps {
  cityName: string;
  isOpen: boolean;
  onToggle: () => void;
  language?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface BrochureUITranslations {
  chatAbout?: string;
  askUsAnything?: string;
  clickToStart?: string;
  typeMessage?: string;
  interestedIn?: string;
}

export const BrochureChatbot: React.FC<BrochureChatbotProps> = ({
  cityName,
  isOpen,
  onToggle,
  language = 'en',
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get UI translations with fallbacks
  const brochuresUI = (t.brochures as Record<string, unknown>)?.ui as BrochureUITranslations | undefined;
  const uiText = {
    chatAbout: brochuresUI?.chatAbout || 'Chat About {city}',
    askUsAnything: brochuresUI?.askUsAnything || 'Ask us anything about properties in {city}',
    clickToStart: brochuresUI?.clickToStart || 'Click send to start the conversation',
    typeMessage: brochuresUI?.typeMessage || 'Type your message...',
    interestedIn: brochuresUI?.interestedIn || "Hi, I'm interested in properties in {city}",
  };

  // Pre-fill the first message when opened
  useEffect(() => {
    if (isOpen && !hasStarted) {
      setInput(uiText.interestedIn.replace('{city}', cityName));
    }
  }, [isOpen, cityName, hasStarted, uiText.interestedIn]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setHasStarted(true);
    setIsLoading(true);

    // Simulate bot response (in production, connect to your AI chatbot)
    setTimeout(() => {
      const botResponse = `Thank you for your interest in ${cityName}! Our team of local experts can help you find the perfect property. Would you like to chat with Emma for personalized guidance, or would you prefer to receive our detailed brochure first?`;
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-muted-foreground' : 'bg-prime-gold hover:bg-prime-gold/90'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-prime-950" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-prime-950 px-4 py-4">
            <h3 className="font-display text-lg text-white">
              {uiText.chatAbout.replace('{city}', cityName)}
            </h3>
            <p className="text-white/70 text-sm">
              {uiText.askUsAnything.replace('{city}', cityName)}
            </p>
          </div>

          {/* Messages */}
          <div className="h-[300px] overflow-y-auto p-4 space-y-4 bg-muted/20">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                {uiText.clickToStart}
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-prime-gold text-prime-950'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-2xl">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={uiText.typeMessage}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-prime-gold hover:bg-prime-gold/90 text-prime-950"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
