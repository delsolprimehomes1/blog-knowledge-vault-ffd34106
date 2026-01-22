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
  urgent_emails_enabled?: boolean;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  phone?: string;
  email?: string;
  language?: string;
  preferred_language?: string;
  lead_segment?: string;
  budget_range?: string;
  location_preference?: string[];
  areas_of_interest?: string[];
  timeframe?: string;
  timeline?: string;
  lead_source?: string;
  source?: string;
  property_type?: string;
  claim_window_expires_at?: string;
  created_at?: string;
  interest?: string;
  property_ref?: string;
  current_round?: number;
}

interface NotificationRequest {
  lead: Lead;
  agents: Agent[];
  claimWindowMinutes: number;
  notification_type?: 'broadcast' | 'direct_assignment' | 'sla_escalation' | 'test_urgent' | 'admin_unclaimed';
  lead_priority?: string;
  isAdminFallback?: boolean;
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
    hot: "#EF4444",
    Warm: "#F59E0B",
    warm: "#F59E0B",
    Cool: "#3B82F6",
    cool: "#3B82F6",
    Cold: "#6B7280",
    cold: "#6B7280",
  };
  return colors[segment] || "#6B7280";
}

// Normalize lead data to handle different property names
function normalizeLead(lead: Lead): Lead {
  return {
    ...lead,
    phone_number: lead.phone_number || lead.phone || "Not provided",
    language: lead.language || lead.preferred_language || "en",
    lead_segment: lead.lead_segment || "New",
    location_preference: lead.location_preference || lead.areas_of_interest,
    timeframe: lead.timeframe || lead.timeline,
    lead_source: lead.lead_source || lead.source || "Website",
  };
}

function generateEmailHtml(lead: Lead, agentName: string, claimUrl: string, claimWindowMinutes: number): string {
  const normalizedLead = normalizeLead(lead);
  const flag = getLanguageFlag(normalizedLead.language!);
  const segmentColor = getSegmentColor(normalizedLead.lead_segment!);
  
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
                A new ${normalizedLead.language?.toUpperCase()} lead matching your profile is available for claiming:
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
                            ${normalizedLead.lead_segment}
                          </span>
                        </td>
                      </tr>
                    </table>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.phone_number}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Budget</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.budget_range || "Not specified"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Location</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.location_preference?.join(", ") || "Not specified"}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Timeframe</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.timeframe || "Not specified"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Source</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.lead_source}</p>
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

// Generate URGENT email template with red styling
function generateUrgentEmailHtml(lead: Lead, agentName: string, claimUrl: string, claimWindowMinutes: number, notificationType: string): string {
  const normalizedLead = normalizeLead(lead);
  const flag = getLanguageFlag(normalizedLead.language!);
  const segmentColor = getSegmentColor(normalizedLead.lead_segment!);
  
  const urgencyMessage = notificationType === 'sla_escalation' 
    ? "This lead has been escalated due to SLA breach!"
    : notificationType === 'direct_assignment'
    ? "You have been directly assigned to this lead!"
    : notificationType === 'test_urgent'
    ? "This is a test of the urgent email template."
    : "This is a high-priority lead requiring immediate action!";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔥 URGENT LEAD</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(220, 38, 38, 0.2);">
          <!-- URGENT Header - Red Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🔥 URGENT LEAD - ACTION REQUIRED
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 500;">
                ${urgencyMessage}
              </p>
            </td>
          </tr>
          
          <!-- Priority Alert Banner -->
          <tr>
            <td style="background-color: #FEE2E2; padding: 16px 30px; border-bottom: 2px solid #DC2626;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; color: #991B1B; font-size: 15px; font-weight: 700;">
                      ⚡ THIS LEAD REQUIRES IMMEDIATE ATTENTION
                    </p>
                    <p style="margin: 4px 0 0; color: #B91C1C; font-size: 13px;">
                      You have ${claimWindowMinutes} minutes to respond
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
                ${flag} A high-priority ${normalizedLead.language?.toUpperCase()} lead requires your immediate attention:
              </p>
              
              <!-- Lead Card - Highlighted -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF2F2; border-radius: 8px; border: 2px solid #FCA5A5; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px; font-weight: bold;">
                            ${lead.first_name} ${lead.last_name}
                          </h2>
                          <span style="display: inline-block; background-color: ${segmentColor}; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-right: 8px;">
                            ${normalizedLead.lead_segment}
                          </span>
                          ${lead.budget_range ? `<span style="display: inline-block; background-color: #059669; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px;">${lead.budget_range}</span>` : ''}
                        </td>
                      </tr>
                    </table>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${normalizedLead.phone_number}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Language</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${flag} ${normalizedLead.language?.toUpperCase()}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Location</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.location_preference?.join(", ") || "Not specified"}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Timeframe</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.timeframe || "Not specified"}</p>
                        </td>
                      </tr>
                      ${lead.property_type ? `
                      <tr>
                        <td colspan="2" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Property Type</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.property_type}</p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td colspan="2" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Source</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.lead_source}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- LARGE URGENT CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #ffffff; font-size: 18px; font-weight: bold; text-decoration: none; padding: 20px 60px; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4); text-transform: uppercase; letter-spacing: 1px;">
                      🔥 CLAIM THIS LEAD IMMEDIATELY 🔥
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #991B1B; font-size: 14px; text-align: center; font-weight: 600;">
                ⚠️ This is a direct assignment. Your response is expected immediately!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; padding: 20px 30px;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                Del Sol Prime Homes CRM • Priority Alert System<br>
                <span style="color: #FCA5A5;">This is an automated urgent notification</span>
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

// Generate Admin Unclaimed Lead email template
function generateAdminUnclaimedEmailHtml(
  lead: Lead, 
  adminName: string, 
  leadDetailUrl: string,
  roundsAttempted: number
): string {
  const normalizedLead = normalizeLead(lead);
  const flag = getLanguageFlag(normalizedLead.language!);
  const segmentColor = getSegmentColor(normalizedLead.lead_segment!);
  const createdAt = lead.created_at ? new Date(lead.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : 'Unknown';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚨 Unclaimed Lead - Admin Action Required</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(234, 88, 12, 0.2);">
          <!-- URGENT Header - Orange/Red Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: bold;">
                🚨 UNCLAIMED LEAD - MANUAL ACTION REQUIRED
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.95); font-size: 15px; font-weight: 500;">
                This lead was not claimed after ${roundsAttempted} round${roundsAttempted !== 1 ? 's' : ''}
              </p>
            </td>
          </tr>
          
          <!-- Warning Banner -->
          <tr>
            <td style="background-color: #FED7AA; padding: 16px 30px; border-bottom: 2px solid #EA580C;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; color: #9A3412; font-size: 15px; font-weight: 700;">
                      ⚠️ No agents claimed this lead within the claim window
                    </p>
                    <p style="margin: 4px 0 0; color: #C2410C; font-size: 13px;">
                      This lead has been auto-assigned to you for manual handling
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
                Hi ${adminName},
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                A lead requires your manual intervention. Please review the details below and assign to an appropriate agent:
              </p>
              
              <!-- Lead Card - Full Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF7ED; border-radius: 8px; border: 2px solid #FDBA74; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px; font-weight: bold;">
                            ${lead.first_name} ${lead.last_name}
                          </h2>
                          <span style="display: inline-block; background-color: ${segmentColor}; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-right: 8px;">
                            ${normalizedLead.lead_segment}
                          </span>
                          <span style="display: inline-block; background-color: #6366F1; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px;">
                            ${flag} ${normalizedLead.language?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    </table>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${normalizedLead.phone_number}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Email</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${lead.email || 'Not provided'}</p>
                        </td>
                      </tr>
                      ${lead.interest ? `
                      <tr>
                        <td colspan="2" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Property Interest</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600; background-color: #FEF3C7; padding: 8px; border-radius: 4px;">${lead.interest}</p>
                        </td>
                      </tr>
                      ` : ''}
                      ${lead.property_ref ? `
                      <tr>
                        <td colspan="2" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Property Reference</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.property_ref}</p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Budget</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.budget_range || "Not specified"}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Property Type</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.property_type || "Not specified"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Source</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.lead_source}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Created</p>
                          <p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${createdAt}</p>
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
                    <a href="${leadDetailUrl}" style="display: inline-block; background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); color: #ffffff; font-size: 18px; font-weight: bold; text-decoration: none; padding: 18px 50px; border-radius: 10px; box-shadow: 0 6px 20px rgba(234, 88, 12, 0.4); text-transform: uppercase;">
                      📋 View Lead & Assign Agent
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #9A3412; font-size: 14px; text-align: center; font-weight: 500;">
                You can assign this lead to any available agent from the lead detail page.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1F2937; padding: 20px 30px;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                Del Sol Prime Homes CRM • Admin Fallback System<br>
                <span style="color: #FDBA74;">This lead was auto-assigned after failing to be claimed</span>
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
  const normalizedLead = normalizeLead(lead);
  const flag = getLanguageFlag(normalizedLead.language!);
  
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${flag} New ${normalizedLead.language?.toUpperCase()} Lead Available!`,
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
          text: `*Segment:*\n${normalizedLead.lead_segment}`
        },
        {
          type: "mrkdwn",
          text: `*Phone:*\n${normalizedLead.phone_number}`
        },
        {
          type: "mrkdwn",
          text: `*Budget:*\n${lead.budget_range || "Not specified"}`
        },
        {
          type: "mrkdwn",
          text: `*Location:*\n${normalizedLead.location_preference?.join(", ") || "Not specified"}`
        },
        {
          type: "mrkdwn",
          text: `*Timeframe:*\n${normalizedLead.timeframe || "Not specified"}`
        }
      ]
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⏱️ *${claimWindowMinutes} minutes* to claim this lead | Source: ${normalizedLead.lead_source}`
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
    const normalizedLead = normalizeLead(lead);
    const blocks = generateSlackBlocks(lead, agentName, claimUrl, claimWindowMinutes);
    const flag = getLanguageFlag(normalizedLead.language!);
    
    const response = await fetch(`${SLACK_GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": slackApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text: `${flag} New ${normalizedLead.language?.toUpperCase()} Lead: ${lead.first_name} ${lead.last_name}`,
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

    const { lead, agents, claimWindowMinutes, notification_type, lead_priority, isAdminFallback }: NotificationRequest = await req.json();

    console.log(`[send-lead-notification] Sending notifications to ${agents.length} agents for lead ${lead.id}, type: ${notification_type || 'broadcast'}`);

    const appUrl = Deno.env.get("APP_URL") || "https://blog-knowledge-vault.lovable.app";
    const results: Array<{ 
      agent: string; 
      emailSuccess: boolean; 
      emailType?: 'standard' | 'urgent' | 'admin_unclaimed';
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

    // Handle admin unclaimed notification type
    const isAdminUnclaimedNotification = notification_type === 'admin_unclaimed';

    // Determine if this is an urgent notification
    const isUrgentNotification = 
      notification_type === 'direct_assignment' ||
      notification_type === 'sla_escalation' ||
      notification_type === 'test_urgent' ||
      lead_priority === 'urgent';

    console.log(`[send-lead-notification] Is urgent: ${isUrgentNotification}`);

    for (const agent of agents) {
      const claimUrl = `${appUrl}/crm/agent/leads/${lead.id}/claim`;
      const leadDetailUrl = `${appUrl}/crm/agent/leads/${lead.id}`;
      let emailSuccess = false;
      let emailType: 'standard' | 'urgent' | 'admin_unclaimed' = 'standard';
      let slackSuccess = false;
      let slackChannelCount = 0;
      
      // Determine which email template to use
      const useAdminUnclaimedTemplate = isAdminUnclaimedNotification;
      const useUrgentTemplate = !useAdminUnclaimedTemplate && isUrgentNotification && agent.urgent_emails_enabled !== false;
      emailType = useAdminUnclaimedTemplate ? 'admin_unclaimed' : (useUrgentTemplate ? 'urgent' : 'standard');

      const normalizedLead = normalizeLead(lead);
      const flag = getLanguageFlag(normalizedLead.language!);

      // Send email notification
      try {
        let emailHtml: string;
        if (useAdminUnclaimedTemplate) {
          emailHtml = generateAdminUnclaimedEmailHtml(lead, agent.first_name, leadDetailUrl, lead.current_round || 1);
        } else if (useUrgentTemplate) {
          emailHtml = generateUrgentEmailHtml(lead, agent.first_name, claimUrl, claimWindowMinutes, notification_type || 'urgent');
        } else {
          emailHtml = generateEmailHtml(lead, agent.first_name, claimUrl, claimWindowMinutes);
        }

        let emailSubject: string;
        if (useAdminUnclaimedTemplate) {
          emailSubject = `🚨 UNCLAIMED: ${lead.first_name} ${lead.last_name} - Manual Assignment Required`;
        } else if (useUrgentTemplate) {
          emailSubject = `🔥 URGENT LEAD: ${lead.first_name} ${lead.last_name} - ${lead.budget_range || 'Action Required'}`;
        } else {
          emailSubject = `${flag} New ${normalizedLead.language?.toUpperCase()} Lead: ${lead.first_name} ${lead.last_name}`;
        }

        // Build email headers - add X-Priority for urgent emails
        const emailPayload: Record<string, unknown> = {
          from: "Del Sol Prime Homes <crm@notifications.delsolprimehomes.com>",
          to: [agent.email],
          subject: emailSubject,
          html: emailHtml,
        };

        // Add priority headers for urgent emails
        if (useUrgentTemplate) {
          emailPayload.headers = {
            "X-Priority": "1",
            "X-MSMail-Priority": "High",
            "Importance": "high",
          };
        }

        const emailResponse = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();
        emailSuccess = emailResponse.ok;
        console.log(`[send-lead-notification] ${emailType} email sent to ${agent.email}:`, emailSuccess);
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
        emailType,
        slackSuccess: slackEnabled ? slackSuccess : undefined,
        slackChannels: slackChannelCount
      });
    }

    const emailSuccessCount = results.filter(r => r.emailSuccess).length;
    const urgentEmailCount = results.filter(r => r.emailType === 'urgent').length;
    const slackSuccessCount = results.filter(r => r.slackSuccess).length;
    console.log(`[send-lead-notification] Summary: ${emailSuccessCount}/${agents.length} emails (${urgentEmailCount} urgent), ${slackSuccessCount}/${agents.length} Slack notifications`);

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
