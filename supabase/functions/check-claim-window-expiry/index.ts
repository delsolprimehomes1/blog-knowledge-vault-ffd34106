import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://www.delsolprimehomes.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[check-claim-window-expiry] Starting check...");

    // Find leads where claim window has expired but not yet marked as breached
    const { data: expiredLeads, error: queryError } = await supabase
      .from("crm_leads")
      .select("*")
      .lt("claim_timer_expires_at", new Date().toISOString())
      .eq("lead_claimed", false)
      .eq("claim_sla_breached", false)
      .eq("archived", false);

    if (queryError) {
      console.error("[check-claim-window-expiry] Query error:", queryError);
      throw queryError;
    }

    if (!expiredLeads || expiredLeads.length === 0) {
      console.log("[check-claim-window-expiry] No expired claim windows found");
      return new Response(
        JSON.stringify({ processed: 0, message: "No expired claim windows" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[check-claim-window-expiry] Found ${expiredLeads.length} expired leads`);

    let processedCount = 0;
    let errorCount = 0;

    for (const lead of expiredLeads) {
      try {
        // Get the round robin config for this language to find the fallback admin
        const { data: roundRobinConfig, error: configError } = await supabase
          .from("crm_round_robin_config")
          .select("fallback_admin_id")
          .eq("language", lead.language)
          .eq("is_active", true)
          .order("round_number", { ascending: false })
          .limit(1)
          .single();

        if (configError) {
          console.warn(`[check-claim-window-expiry] Config error for language ${lead.language}:`, configError);
        }

        const fallbackAdminId = roundRobinConfig?.fallback_admin_id;

        // Get admin details if we have a fallback admin
        let adminEmail: string | null = null;
        let adminName: string | null = null;

        if (fallbackAdminId) {
          const { data: adminAgent, error: adminError } = await supabase
            .from("crm_agents")
            .select("email, first_name, last_name")
            .eq("id", fallbackAdminId)
            .single();

          if (!adminError && adminAgent) {
            adminEmail = adminAgent.email;
            adminName = adminAgent.first_name || "Admin";
          }
        }

        // Mark lead as claim SLA breached
        const { error: updateError } = await supabase
          .from("crm_leads")
          .update({ 
            claim_sla_breached: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", lead.id);

        if (updateError) {
          console.error(`[check-claim-window-expiry] Update error for lead ${lead.id}:`, updateError);
          errorCount++;
          continue;
        }

        // Calculate elapsed time since lead creation
        const createdAt = new Date(lead.created_at);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

        // Send email notification if we have an admin email
        if (adminEmail && RESEND_API_KEY) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "CRM Alerts <crm@notifications.delsolprimehomes.com>",
              to: [adminEmail],
              subject: `🚨 Lead Unclaimed - ${lead.first_name} ${lead.last_name} (${lead.language.toUpperCase()})`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .details p { margin: 8px 0; }
                    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
                    .value { font-weight: bold; color: #111827; }
                    .alert-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .cta-button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0;">🚨 Lead Went Unclaimed</h1>
                    </div>
                    <div class="content">
                      <p>Hi ${adminName},</p>
                      <p>A lead went <strong>unclaimed</strong> after the claim window expired and requires your immediate attention.</p>
                      
                      <div class="details">
                        <h3 style="margin-top: 0;">Lead Details</h3>
                        <p><span class="label">Name:</span> <span class="value">${lead.first_name} ${lead.last_name}</span></p>
                        <p><span class="label">Phone:</span> <span class="value">${lead.phone_number || "Not provided"}</span></p>
                        <p><span class="label">Email:</span> <span class="value">${lead.email || "Not provided"}</span></p>
                        <p><span class="label">Language:</span> <span class="value">${lead.language?.toUpperCase()}</span></p>
                        <p><span class="label">Source:</span> <span class="value">${lead.lead_source || "Unknown"}</span></p>
                        <p><span class="label">Created:</span> <span class="value">${elapsedMinutes} minutes ago</span></p>
                      </div>

                      <div class="alert-box">
                        <h4 style="margin-top: 0; color: #dc2626;">⚠️ Situation</h4>
                        <ul style="margin: 0; padding-left: 20px;">
                          <li>Claim window expired after 5 minutes</li>
                          <li>No agent claimed this lead</li>
                          <li>Lead is sitting idle and needs reassignment</li>
                        </ul>
                      </div>

                      <p><strong>Action Required:</strong> Please manually reassign this lead to an available agent.</p>
                      
                      <center>
                        <a href="${APP_URL}/crm/admin/leads" class="cta-button">View Leads & Reassign</a>
                      </center>
                    </div>
                    <div class="footer">
                      <p>Del Sol Prime Homes CRM - Automated Alert</p>
                      <p>This is an automated message. Please do not reply directly.</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error(`[check-claim-window-expiry] Email send failed for lead ${lead.id}:`, errorText);
          } else {
            console.log(`[check-claim-window-expiry] Email sent to ${adminEmail} for lead ${lead.id}`);
          }
        } else {
          console.warn(`[check-claim-window-expiry] No admin email available for lead ${lead.id}`);
        }

        // Create in-app notification if we have a fallback admin
        if (fallbackAdminId) {
          const { error: notifError } = await supabase
            .from("crm_notifications")
            .insert({
              agent_id: fallbackAdminId,
              lead_id: lead.id,
              notification_type: "claim_sla_breach",
              title: "🚨 Lead Unclaimed - Claim Window Expired",
              message: `${lead.first_name} ${lead.last_name} (${lead.language?.toUpperCase()}) went unclaimed after 5 minutes - requires reassignment`,
              action_url: `/crm/admin/leads`,
              read: false,
            });

          if (notifError) {
            console.error(`[check-claim-window-expiry] Notification error for lead ${lead.id}:`, notifError);
          }
        }

        // Log activity for audit trail
        const { error: activityError } = await supabase
          .from("crm_activities")
          .insert({
            lead_id: lead.id,
            agent_id: fallbackAdminId,
            activity_type: "note",
            notes: `⚠️ CLAIM SLA BREACH: Claim window expired after 5 minutes - no agent claimed this lead. Admin notified for manual reassignment.`,
            created_at: new Date().toISOString(),
          });

        if (activityError) {
          console.error(`[check-claim-window-expiry] Activity log error for lead ${lead.id}:`, activityError);
        }

        processedCount++;
        console.log(`[check-claim-window-expiry] Successfully processed lead ${lead.id}`);

      } catch (leadError) {
        console.error(`[check-claim-window-expiry] Error processing lead ${lead.id}:`, leadError);
        errorCount++;
      }
    }

    console.log(`[check-claim-window-expiry] Complete. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        processed: processedCount, 
        errors: errorCount,
        total: expiredLeads.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[check-claim-window-expiry] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
