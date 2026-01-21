import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Using fetch instead of Resend SDK for Deno compatibility
const RESEND_API_URL = "https://api.resend.com/emails";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Agent {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email?: string;
  language: string;
  lead_segment: string;
  budget_range?: string;
  location_preference?: string[];
  timeframe?: string;
  lead_source?: string;
  claim_window_expires_at?: string;
}

interface NotificationRequest {
  lead: Lead;
  agents: Agent[];
  claimWindowMinutes: number;
}

function getLanguageFlag(language: string): string {
  const flags: Record<string, string> = {
    fr: "🇫🇷", fi: "🇫🇮", pl: "🇵🇱", en: "🇬🇧", nl: "🇳🇱",
    de: "🇩🇪", es: "🇪🇸", sv: "🇸🇪", da: "🇩🇰", hu: "🇭🇺",
  };
  return flags[language?.toLowerCase()] || "🌍";
}

function getSegmentColor(segment: string): string {
  const colors: Record<string, string> = {
    Hot: "#EF4444",
    Warm: "#F59E0B",
    Cool: "#3B82F6",
    Cold: "#6B7280",
  };
  return colors[segment] || "#6B7280";
}

function generateEmailHtml(lead: Lead, agentName: string, claimUrl: string, claimWindowMinutes: number): string {
  const flag = getLanguageFlag(lead.language);
  const segmentColor = getSegmentColor(lead.lead_segment);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead Available</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                ${flag} New Lead Available!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Claim this lead before it's gone
              </p>
            </td>
          </tr>
          
          <!-- Countdown Alert -->
          <tr>
            <td style="background-color: #FEF3C7; padding: 16px 30px; border-bottom: 1px solid #FCD34D;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 600;">
                      ⏱️ You have ${claimWindowMinutes} minutes to claim this lead
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                Hi ${agentName},
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                A new ${lead.language.toUpperCase()} lead matching your profile is available for claiming:
              </p>
              
              <!-- Lead Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 4px; color: #111827; font-size: 20px; font-weight: bold;">
                            ${lead.first_name} ${lead.last_name}
                          </h2>
                          <span style="display: inline-block; background-color: ${segmentColor}; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px;">
                            ${lead.lead_segment}
                          </span>
                        </td>
                      </tr>
                    </table>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.phone_number}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Budget</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.budget_range || "Not specified"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Location</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.location_preference?.join(", ") || "Not specified"}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Timeframe</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.timeframe || "Not specified"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Source</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.lead_source || "Website"}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%); color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);">
                      ⚡ Claim This Lead Now
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                First agent to claim gets the lead. Act fast!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                Del Sol Prime Homes CRM • Agent Portal<br>
                <a href="#" style="color: #D4AF37;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-lead-notification] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { lead, agents, claimWindowMinutes }: NotificationRequest = await req.json();

    console.log(`[send-lead-notification] Sending emails to ${agents.length} agents for lead ${lead.id}`);

    const appUrl = Deno.env.get("APP_URL") || "https://blog-knowledge-vault.lovable.app";
    const results: Array<{ agent: string; success: boolean; error?: string }> = [];

    for (const agent of agents) {
      const claimUrl = `${appUrl}/crm/agent/leads/${lead.id}/claim`;
      
      try {
        const emailResponse = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Del Sol Prime Homes <crm@notifications.delsolprimehomes.com>",
            to: [agent.email],
            subject: `${getLanguageFlag(lead.language)} New ${lead.language.toUpperCase()} Lead: ${lead.first_name} ${lead.last_name}`,
            html: generateEmailHtml(lead, agent.first_name, claimUrl, claimWindowMinutes),
          }),
        });

        const emailResult = await emailResponse.json();
        console.log(`[send-lead-notification] Email sent to ${agent.email}:`, emailResult);
        results.push({ agent: agent.email, success: emailResponse.ok });
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error(`[send-lead-notification] Failed to send to ${agent.email}:`, emailError);
        results.push({ agent: agent.email, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[send-lead-notification] Sent ${successCount}/${agents.length} emails successfully`);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[send-lead-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
