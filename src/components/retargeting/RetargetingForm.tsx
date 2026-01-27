import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const RetargetingForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    question: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 2 will connect to Supabase
    console.log("Form submitted:", formData);
    setIsSubmitted(true);
  };

  return (
    <section className="bg-[#faf9f7] py-20 md:py-24 lg:py-28">
      <div className="max-w-[500px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-medium text-[#1a1f2e] mb-3">
              Receive written information if and when you want it.
            </h2>
            <p className="text-[#6b7280] text-sm md:text-base">
              No obligation. No next step implied.
            </p>
          </div>

          {/* Form or Success Message */}
          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-slate-100"
            >
              <div className="w-12 h-12 bg-[#c9a962]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-[#c9a962]" />
              </div>
              <p className="text-[#1a1f2e] text-lg font-medium">
                Thank you.
              </p>
              <p className="text-[#6b7280] mt-2">
                We'll send you information shortly.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* First Name - Optional */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-[#1a1f2e] mb-2"
                >
                  First name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Your first name"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="bg-white border-slate-200 focus:border-[#c9a962] focus:ring-[#c9a962]/20"
                />
              </div>

              {/* Email - Required */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#1a1f2e] mb-2"
                >
                  Email <span className="text-[#c9a962]">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="bg-white border-slate-200 focus:border-[#c9a962] focus:ring-[#c9a962]/20"
                />
              </div>

              {/* Question - Optional */}
              <div>
                <label
                  htmlFor="question"
                  className="block text-sm font-medium text-[#1a1f2e] mb-2"
                >
                  What would you like to understand better?
                </label>
                <Textarea
                  id="question"
                  placeholder="Optional — tell us what's on your mind"
                  rows={4}
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  className="bg-white border-slate-200 focus:border-[#c9a962] focus:ring-[#c9a962]/20 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="text-center pt-2">
                <Button
                  type="submit"
                  className="bg-[#c9a962] hover:bg-[#b8994f] text-white px-8 py-5 text-base font-medium rounded-md transition-colors duration-200"
                >
                  Request information
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};
