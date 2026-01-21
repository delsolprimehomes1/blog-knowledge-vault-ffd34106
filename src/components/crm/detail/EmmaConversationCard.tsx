import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Check, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type CrmLead = Database["public"]["Tables"]["crm_leads"]["Row"];

interface QAPair {
  question: string;
  answer: string;
}

interface EmmaConversationCardProps {
  lead: CrmLead;
}

export function EmmaConversationCard({ lead }: EmmaConversationCardProps) {
  const qaPairs = (lead.qa_pairs as unknown as QAPair[] | null) || [];

  if (qaPairs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Emma Conversation History
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {lead.questions_answered || qaPairs.length} questions answered
            </Badge>
            {lead.intake_complete ? (
              <Badge className="text-xs bg-green-100 text-green-800">
                <Check className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Incomplete{lead.exit_point ? ` - ${lead.exit_point}` : ""}
              </Badge>
            )}
            {lead.conversation_duration && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {lead.conversation_duration}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 pr-4">
          <div className="space-y-4">
            {qaPairs.map((qa, index) => (
              <div key={index} className="space-y-2">
                {/* Question (Emma) */}
                <div className="flex justify-start">
                  <div className="bg-primary/10 rounded-lg rounded-bl-none px-4 py-2 max-w-[85%]">
                    <p className="text-xs font-medium text-primary mb-1">
                      Question {index + 1}:
                    </p>
                    <p className="text-sm">{qa.question}</p>
                  </div>
                </div>

                {/* Answer (Lead) */}
                <div className="flex justify-end">
                  <div className="bg-muted rounded-lg rounded-br-none px-4 py-2 max-w-[85%]">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Their Answer:
                    </p>
                    <p className="text-sm font-medium">{qa.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
