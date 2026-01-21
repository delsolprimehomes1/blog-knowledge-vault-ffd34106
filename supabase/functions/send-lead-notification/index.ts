import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";
const SLACK_GATEWAY_URL = "https://gateway.lovable.dev/slack/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Agent {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  slack_notifications?: boolean;
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

function generateSlackBlocks(lead: Lead, agentName: string, claimUrl: string, claimWindowMinutes: number) {
  const flag = getLanguageFlag(lead.language);
  
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${flag} New ${lead.language.toUpperCase()} Lead Available!`,
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hey ${agentName}! A new lead matching your profile is ready to claim.`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Name:*\n${lead.first_name} ${lead.last_name}`
        },
        {
          type: "mrkdwn",
          text: `*Segment:*\n${lead.lead_segment}`
        },
        {
          type: "mrkdwn",
          text: `*Phone:*\n${lead.phone_number}`
        },
        {
          type: "mrkdwn",
          text: `*Budget:*\n${lead.budget_range || "Not specified"}`
        },
        {
          type: "mrkdwn",
          text: `*Location:*\n${lead.location_preference?.join(", ") || "Not specified"}`
        },
        {
          type: "mrkdwn",
          text: `*Timeframe:*\n${lead.timeframe || "Not specified"}`
        }
      ]
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⏱️ *${claimWindowMinutes} minutes* to claim this lead | Source: ${lead.lead_source || "Website"}`
        }
      ]
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "⚡ Claim This Lead",
            emoji: true
          },
          style: "primary",
          url: claimUrl
        }
      ]
    }
  ];
}

async function sendSlackMessage(
  channelId: string,
  lead: Lead,
  agentName: string,
  claimUrl: string,
  claimWindowMinutes: number,
  lovableApiKey: string,
  slackApiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const blocks = generateSlackBlocks(lead, agentName, claimUrl, claimWindowMinutes);
    const flag = getLanguageFlag(lead.language);
    
    const response = await fetch(`${SLACK_GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": slackApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text: `${flag} New ${lead.language.toUpperCase()} Lead: ${lead.first_name} ${lead.last_name}`,
        blocks,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      console.error(`[Slack] Error posting to ${channelId}:`, data);
      return { success: false, error: data.error || "Unknown Slack error" };
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Slack] Exception posting to ${channelId}:`, error);
    return { success: false, error: errorMessage };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const slackApiKey = Deno.env.get("SLACK_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!resendApiKey) {
      console.error("[send-lead-notification] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { lead, agents, claimWindowMinutes }: NotificationRequest = await req.json();

    console.log(`[send-lead-notification] Sending notifications to ${agents.length} agents for lead ${lead.id}`);

    const appUrl = Deno.env.get("APP_URL") || "https://blog-knowledge-vault.lovable.app";
    const results: Array<{ 
      agent: string; 
      emailSuccess: boolean; 
      slackSuccess?: boolean;
      slackChannels?: number;
      error?: string 
    }> = [];

    // Check if Slack is configured
    const slackEnabled = !!(lovableApiKey && slackApiKey);
    if (slackEnabled) {
      console.log("[send-lead-notification] Slack integration is enabled");
    } else {
      console.log("[send-lead-notification] Slack integration not configured - skipping Slack notifications");
    }

    for (const agent of agents) {
      const claimUrl = `${appUrl}/crm/agent/leads/${lead.id}/claim`;
      let emailSuccess = false;
      let slackSuccess = false;
      let slackChannelCount = 0;
      
      // Send email notification
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
        emailSuccess = emailResponse.ok;
        console.log(`[send-lead-notification] Email sent to ${agent.email}:`, emailSuccess);
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error(`[send-lead-notification] Failed to send email to ${agent.email}:`, emailError);
      }

      // Send Slack notifications if enabled and agent has Slack notifications turned on
      if (slackEnabled && agent.slack_notifications) {
        try {
          // Get agent's assigned Slack channels
          const { data: agentChannels, error: channelsError } = await supabase
            .from("agent_slack_channels")
            .select("channel_id, channel_name")
            .eq("agent_id", agent.id)
            .eq("is_active", true);

          if (channelsError) {
            console.error(`[send-lead-notification] Error fetching Slack channels for ${agent.email}:`, channelsError);
          } else if (agentChannels && agentChannels.length > 0) {
            slackChannelCount = agentChannels.length;
            console.log(`[send-lead-notification] Sending to ${slackChannelCount} Slack channels for ${agent.email}`);

            let successCount = 0;
            for (const channel of agentChannels) {
              const result = await sendSlackMessage(
                channel.channel_id,
                lead,
                agent.first_name,
                claimUrl,
                claimWindowMinutes,
                lovableApiKey!,
                slackApiKey!
              );
              if (result.success) successCount++;
            }
            slackSuccess = successCount > 0;
            console.log(`[send-lead-notification] Slack: ${successCount}/${slackChannelCount} channels notified for ${agent.email}`);
          }
        } catch (slackError: unknown) {
          console.error(`[send-lead-notification] Slack error for ${agent.email}:`, slackError);
        }
      }

      results.push({ 
        agent: agent.email, 
        emailSuccess,
        slackSuccess: slackEnabled ? slackSuccess : undefined,
        slackChannels: slackChannelCount
      });
    }

    const emailSuccessCount = results.filter(r => r.emailSuccess).length;
    const slackSuccessCount = results.filter(r => r.slackSuccess).length;
    console.log(`[send-lead-notification] Summary: ${emailSuccessCount}/${agents.length} emails, ${slackSuccessCount}/${agents.length} Slack notifications`);

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
