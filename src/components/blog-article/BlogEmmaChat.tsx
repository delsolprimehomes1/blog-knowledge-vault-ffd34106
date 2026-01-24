import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import EmmaChat from '@/components/landing/EmmaChat';

interface BlogEmmaChatProps {
  language: string;
}

const BlogEmmaChat: React.FC<BlogEmmaChatProps> = ({ language }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Listen for external open triggers (from CTA buttons, etc.)
  useEffect(() => {
    const handleOpenChatbot = () => {
      setIsOpen(true);
    };
    
    window.addEventListener('openChatbot', handleOpenChatbot);
    return () => {
      window.removeEventListener('openChatbot', handleOpenChatbot);
    };
  }, []);
  
  // Emma's avatar for the floating button
  const emmaAvatar = 'https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/695df9a00597dfcfb07a11d0.jpeg';

  return (
    <>
      {/* Floating Button - Matches landing page Emma trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Chat with Emma"
        >
          <div className="relative">
            <img
              src={emmaAvatar}
              alt="Chat with Emma"
              className="w-16 h-16 rounded-full object-cover border-3 border-landing-gold shadow-2xl 
                         transition-transform group-hover:scale-110"
            />
            {/* Pulse indicator */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-landing-gold rounded-full 
                            flex items-center justify-center animate-pulse">
              <MessageCircle className="w-3 h-3 text-white" />
            </div>
          </div>
        </button>
      )}

      {/* Emma Chat Component - Same as landing pages */}
      <EmmaChat 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        language={language} 
      />
    </>
  );
};

export default BlogEmmaChat;
