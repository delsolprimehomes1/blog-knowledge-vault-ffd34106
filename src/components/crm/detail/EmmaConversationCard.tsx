import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageCircle, Check, AlertCircle, Clock, ChevronDown, ChevronUp, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type CrmLead = Database["public"]["Tables"]["crm_leads"]["Row"];

interface QAPair {
  question: string;
  answer: string;
}

interface TranscriptMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

interface EmmaConversationCardProps {
  lead: CrmLead;
}

export function EmmaConversationCard({ lead }: EmmaConversationCardProps) {
  const [showQASummary, setShowQASummary] = useState(false);
  
  const qaPairs = (lead.qa_pairs as unknown as QAPair[] | null) || [];
  const transcript = (lead.conversation_transcript as unknown as TranscriptMessage[] | null) || [];
  
  // If no transcript and no Q&A pairs, don't render
  if (transcript.length === 0 && qaPairs.length === 0) return null;

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Emma Conversation History
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {transcript.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {transcript.length} messages
              </Badge>
            )}
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
      <CardContent className="space-y-4">
        {/* Full Conversation Transcript */}
        {transcript.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Full Conversation</p>
            <ScrollArea className="h-80 pr-4 border rounded-lg p-3 bg-muted/20">
              <div className="space-y-3">
                {transcript.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'assistant' ? "justify-start" : "justify-end"
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 max-w-[80%]",
                        msg.role === 'assistant'
                          ? "bg-primary/10 text-foreground rounded-bl-none"
                          : "bg-muted text-foreground rounded-br-none"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.timestamp && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatTimestamp(msg.timestamp)}
                        </p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Q&A Summary (Collapsible) */}
        {qaPairs.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
              onClick={() => setShowQASummary(!showQASummary)}
            >
              <span className="text-sm font-medium">
                Extracted Q&A Summary ({qaPairs.length} pairs)
              </span>
              {showQASummary ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            
            {showQASummary && (
              <ScrollArea className="h-48 pr-4 mt-2">
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
            )}
          </div>
        )}

        {/* Fallback: Only Q&A pairs, no transcript (legacy leads) */}
        {transcript.length === 0 && qaPairs.length > 0 && !showQASummary && (
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
        )}
      </CardContent>
    </Card>
  );
}
