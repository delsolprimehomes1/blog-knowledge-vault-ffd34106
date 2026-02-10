import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://www.delsolprimehomes.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Level-specific styling configuration
const ALARM_CONFIG: Record<number, { 
  emoji: string; text: string; color: string;
  subjectTemplate: (lang: string) => string;
}> = {
  1: { 
    emoji: "⏰", 
    text: "1 MIN PASSED", 
    color: "#EAB308",
    subjectTemplate: (lang) => `CRM_NEW_LEAD_${lang}_T1 | Reminder 1 – lead not claimed (1 min)`
  },
  2: { 
    emoji: "⚠️", 
    text: "2 MIN PASSED", 
    color: "#F97316",
    subjectTemplate: (lang) => `CRM_NEW_LEAD_${lang}_T2 | Reminder 2 – SLA running (2 min)`
  },
  3: { 
    emoji: "🚨", 
    text: "3 MIN PASSED", 
    color: "#EA580C",
    subjectTemplate: (lang) => `CRM_NEW_LEAD_${lang}_T3 | Reminder 3 – URGENT (3 min)`
  },
  4: { 
    emoji: "🔥", 
    text: "4 MIN PASSED - FINAL WARNING", 
    color: "#DC2626",
    subjectTemplate: (lang) => `CRM_NEW_LEAD_${lang}_T4 | FINAL reminder – fallback in 1 minute`
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[send-escalating-alarms] Starting escalating alarm check...");

    const now = new Date();
    const alarmsToSend: Array<{ lead: any; targetLevel: number; agents: any[] }> = [];

    // Check each alarm level (1-4)
    for (let level = 1; level <= 4; level++) {
      const minutesSinceCreation = level;
      const targetTime = new Date(now.getTime() - minutesSinceCreation * 60 * 1000);

      console.log(`[send-escalating-alarms] Checking level ${level} - leads with claim_timer_started_at <= ${targetTime.toISOString()}`);

      // Query leads that need this alarm level
      const { data: leads, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("lead_claimed", false)
        .eq("claim_sla_breached", false)
        .eq("archived", false)
        .eq("last_alarm_level", level - 1)
        .not("claim_timer_started_at", "is", null)
        .lte("claim_timer_started_at", targetTime.toISOString());

      if (error) {
        console.error(`[send-escalating-alarms] Error querying level ${level}:`, error);
        continue;
      }

      if (!leads || leads.length === 0) {
        console.log(`[send-escalating-alarms] No leads need level ${level} alarm`);
        continue;
      }

      console.log(`[send-escalating-alarms] Found ${leads.length} leads needing alarm level ${level}`);

      // For each lead, get agents from round robin config
      for (const lead of leads) {
        const language = (lead.language || "en").toLowerCase();

        // Get round robin config for this language
        const { data: config, error: configError } = await supabase
          .from("crm_round_robin_config")
          .select("agent_ids")
          .eq("language", language)
          .single();

        if (configError || !config?.agent_ids?.length) {
          console.warn(`[send-escalating-alarms] No round robin config for language ${language}, lead ${lead.id}`);
          continue;
        }

        // Get agent details
        const { data: allAgents, error: agentsError } = await supabase
          .from("crm_agents")
          .select("id, email, first_name, last_name, role")
          .in("id", config.agent_ids)
          .eq("is_active", true);

        if (agentsError || !allAgents?.length) {
          console.warn(`[send-escalating-alarms] No active agents found for lead ${lead.id}. Updating alarm level to ensure T+5 fires.`);
          // Still update alarm level so escalation state machine progresses to T+5 breach
          await supabase
            .from("crm_leads")
            .update({ last_alarm_level: level })
            .eq("id", lead.id);
          continue;
        }

        // Smart admin filtering: exclude admins unless they're the only ones available
        const nonAdminAgents = allAgents.filter((a) => a.role !== 'admin');
        let agents;
        if (nonAdminAgents.length > 0) {
          agents = nonAdminAgents;
          console.log(`[send-escalating-alarms] T+${level} for lead ${lead.id}: sending to ${agents.length} non-admin agents`);
        } else {
          agents = allAgents;
          console.warn(`[send-escalating-alarms] T+${level} for lead ${lead.id}: No non-admin agents. Falling back to admins (${agents.length}).`);
        }

        alarmsToSend.push({ lead, targetLevel: level, agents });
      }
    }

    if (alarmsToSend.length === 0) {
      console.log("[send-escalating-alarms] No escalating alarms needed");
      return new Response(
        JSON.stringify({ processed: 0, message: "No alarms needed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-escalating-alarms] Processing ${alarmsToSend.length} total alarms`);

    const results: Array<{ lead_id: string; level: number; success: boolean }> = [];

    for (const { lead, targetLevel, agents } of alarmsToSend) {
      const config = ALARM_CONFIG[targetLevel];
      const agentEmails = agents.map((a) => a.email).filter(Boolean);

      if (agentEmails.length === 0) {
        console.warn(`[send-escalating-alarms] No valid emails for lead ${lead.id}`);
        continue;
      }

      const langCode = (lead.language || "EN").toUpperCase();
      const subject = config.subjectTemplate(langCode);

      // Calculate elapsed time
      const createdAt = new Date(lead.created_at);
      const elapsedMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
      const remainingMinutes = Math.max(0, 5 - elapsedMinutes);

      // Build email HTML
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${config.color}; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ${config.emoji} ${config.text}
              </h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                Lead still unclaimed after ${elapsedMinutes} minute${elapsedMinutes !== 1 ? 's' : ''}!
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">Lead Information</h2>
              
              <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px;">
                <tr>
                  <td style="color: #6b7280; font-size: 14px; width: 120px;">Language:</td>
                  <td style="color: #1f2937; font-size: 14px; font-weight: 600;">${lead.language ? lead.language.toUpperCase() : 'Unknown'}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 14px;">Country:</td>
                  <td style="color: #1f2937; font-size: 14px; font-weight: 600;">${lead.country_flag || '🌍'} ${lead.country_name || 'Not specified'}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 14px;">Time Elapsed:</td>
                  <td style="color: ${config.color}; font-size: 14px; font-weight: 700;">${elapsedMinutes} minute${elapsedMinutes !== 1 ? 's' : ''}</td>
                </tr>
              </table>

              <div style="margin-top: 16px; padding: 12px 16px; background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 6px;">
                <p style="margin: 0; color: #92400E; font-size: 13px; font-weight: 600;">🔒 Claim this lead to see full contact details.</p>
              </div>

              ${targetLevel === 4 ? `
              <!-- Final Warning Banner -->
              <div style="margin-top: 16px; padding: 16px; background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 6px;">
                <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: bold; text-align: center;">
                  ⚠️ FINAL WARNING - If not claimed within 1 minute, this lead will be escalated to admin!
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="margin-top: 24px; text-align: center;">
                <a href="${APP_URL}/crm/agent/leads/${lead.id}/claim" 
                   style="display: inline-block; padding: 14px 32px; background-color: ${config.color}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px;">
                  CLAIM THIS LEAD NOW
                </a>
              </div>

              <!-- Time Remaining -->
              <p style="margin-top: 16px; text-align: center; color: #6b7280; font-size: 14px;">
                Time remaining: <strong style="color: ${config.color};">${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 16px; background-color: #f9fafb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Del Sol Prime Homes CRM - Escalating Alarm Level ${targetLevel}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Send email via Resend
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CRM Alerts <crm@notifications.delsolprimehomes.com>",
            to: agentEmails,
            subject: subject,
            html: emailHtml,
            headers: {
              "X-Priority": targetLevel >= 3 ? "1" : "2",
            },
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`[send-escalating-alarms] Resend error for lead ${lead.id} level ${targetLevel}:`, errorText);
          results.push({ lead_id: lead.id, level: targetLevel, success: false });
          continue;
        }

        const emailResult = await emailResponse.json();
        console.log(`[send-escalating-alarms] Level ${targetLevel} alarm for lead ${lead.id}: Resend ID=${emailResult.id}, recipients=${agentEmails.join(',')}, subject="${subject}"`);

        // Log to crm_email_logs for audit trail
        const emailLogEntries = agents.map(agent => ({
          lead_id: lead.id,
          agent_id: agent.id,
          recipient_email: agent.email,
          recipient_name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || null,
          subject: subject,
          template_type: `escalating_alarm_t${targetLevel}`,
          triggered_by: 'system',
          trigger_reason: `Escalating alarm level ${targetLevel} - ${config.text}`,
          status: 'sent',
          resend_message_id: emailResult.id,
          sent_at: now.toISOString(),
        }));

        const { error: logError } = await supabase
          .from("crm_email_logs")
          .insert(emailLogEntries);

        if (logError) {
          console.error(`[send-escalating-alarms] Email log insert failed for lead ${lead.id} level ${targetLevel}:`, logError);
        }

      } catch (emailError) {
        console.error(`[send-escalating-alarms] Email error for lead ${lead.id}:`, emailError);
        results.push({ lead_id: lead.id, level: targetLevel, success: false });
        continue;
      }

      // Update lead's alarm level
      const { error: updateError } = await supabase
        .from("crm_leads")
        .update({ last_alarm_level: targetLevel })
        .eq("id", lead.id);

      if (updateError) {
        console.error(`[send-escalating-alarms] Failed to update alarm level for lead ${lead.id}:`, updateError);
      }

      // Log activity for audit trail
      const activityAgentId = agents[0]?.id;
      if (activityAgentId) {
        const { error: activityError } = await supabase.from("crm_activities").insert({
          lead_id: lead.id,
          agent_id: activityAgentId,
          activity_type: "note",
          notes: `${config.emoji} Escalating alarm level ${targetLevel} sent - ${config.text} - lead still unclaimed`,
          created_at: now.toISOString(),
        });
        if (activityError) {
          console.error(`[send-escalating-alarms] Activity insert failed for lead ${lead.id}:`, activityError);
        }
      }

      results.push({ lead_id: lead.id, level: targetLevel, success: true });
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`[send-escalating-alarms] Completed - ${successCount}/${results.length} alarms sent successfully`);

    return new Response(
      JSON.stringify({
        processed: results.length,
        success_count: successCount,
        results: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[send-escalating-alarms] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
