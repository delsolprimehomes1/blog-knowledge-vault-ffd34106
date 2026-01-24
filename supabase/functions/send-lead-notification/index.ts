import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  notification_type?: 'broadcast' | 'direct_assignment' | 'sla_escalation' | 'test_urgent' | 'admin_unclaimed' | 'sla_warning';
  lead_priority?: string;
  isAdminFallback?: boolean;
  assigned_agent_name?: string;
  time_since_assignment_minutes?: number;
  triggered_by?: string;
  trigger_reason?: string;
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
    Hot: "#EF4444", hot: "#EF4444",
    Warm: "#F59E0B", warm: "#F59E0B",
    Cool: "#3B82F6", cool: "#3B82F6",
    Cold: "#6B7280", cold: "#6B7280",
  };
  return colors[segment] || "#6B7280";
}

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
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Lead Available</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%); padding: 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">${flag} New Lead Available!</h1><p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Claim this lead before it's gone</p></td></tr><tr><td style="background-color: #FEF3C7; padding: 16px 30px; border-bottom: 1px solid #FCD34D;"><p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 600;">⏱️ You have ${claimWindowMinutes} minutes to claim this lead</p></td></tr><tr><td style="padding: 30px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px;">Hi ${agentName},</p><p style="margin: 0 0 24px; color: #374151; font-size: 16px;">A new ${normalizedLead.language?.toUpperCase()} lead matching your profile is available for claiming:</p><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;"><tr><td style="padding: 20px;"><h2 style="margin: 0 0 4px; color: #111827; font-size: 20px; font-weight: bold;">${lead.first_name} ${lead.last_name}</h2><span style="display: inline-block; background-color: ${segmentColor}; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px;">${normalizedLead.lead_segment}</span><table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;"><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.phone_number}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Budget</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.budget_range || "Not specified"}</p></td></tr><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Location</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.location_preference?.join(", ") || "Not specified"}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Timeframe</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.timeframe || "Not specified"}</p></td></tr><tr><td colspan="2" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Source</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.lead_source}</p></td></tr></table></td></tr></table><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%); color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);">⚡ Claim This Lead Now</a></td></tr></table><p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center;">First agent to claim gets the lead. Act fast!</p></td></tr><tr><td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">Del Sol Prime Homes CRM • Agent Portal</p></td></tr></table></td></tr></table></body></html>`;
}

function generateUrgentEmailHtml(lead: Lead, agentName: string, claimUrl: string, claimWindowMinutes: number, notificationType: string): string {
  const normalizedLead = normalizeLead(lead);
  const flag = getLanguageFlag(normalizedLead.language!);
  const segmentColor = getSegmentColor(normalizedLead.lead_segment!);
  const urgencyMessage = notificationType === 'sla_escalation' ? "This lead has been escalated due to SLA breach!" : notificationType === 'direct_assignment' ? "You have been directly assigned to this lead!" : notificationType === 'test_urgent' ? "This is a test of the urgent email template." : "This is a high-priority lead requiring immediate action!";
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>🔥 URGENT LEAD</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(220, 38, 38, 0.2);"><tr><td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔥 URGENT LEAD - ACTION REQUIRED</h1><p style="margin: 10px 0 0; color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 500;">${urgencyMessage}</p></td></tr><tr><td style="background-color: #FEE2E2; padding: 16px 30px; border-bottom: 2px solid #DC2626;"><p style="margin: 0; color: #991B1B; font-size: 15px; font-weight: 700;">⚡ THIS LEAD REQUIRES IMMEDIATE ATTENTION</p><p style="margin: 4px 0 0; color: #B91C1C; font-size: 13px;">You have ${claimWindowMinutes} minutes to respond</p></td></tr><tr><td style="padding: 30px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px;">Hi ${agentName},</p><p style="margin: 0 0 24px; color: #374151; font-size: 16px;">${flag} A high-priority ${normalizedLead.language?.toUpperCase()} lead requires your immediate attention:</p><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF2F2; border-radius: 8px; border: 2px solid #FCA5A5; margin-bottom: 24px;"><tr><td style="padding: 20px;"><h2 style="margin: 0 0 8px; color: #111827; font-size: 22px; font-weight: bold;">${lead.first_name} ${lead.last_name}</h2><span style="display: inline-block; background-color: ${segmentColor}; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-right: 8px;">${normalizedLead.lead_segment}</span>${lead.budget_range ? `<span style="display: inline-block; background-color: #059669; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px;">${lead.budget_range}</span>` : ''}<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;"><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p><p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${normalizedLead.phone_number}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Language</p><p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${flag} ${normalizedLead.language?.toUpperCase()}</p></td></tr><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Location</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.location_preference?.join(", ") || "Not specified"}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Timeframe</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.timeframe || "Not specified"}</p></td></tr><tr><td colspan="2" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Source</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.lead_source}</p></td></tr></table></td></tr></table><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #ffffff; font-size: 18px; font-weight: bold; text-decoration: none; padding: 20px 60px; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4); text-transform: uppercase; letter-spacing: 1px;">🔥 CLAIM THIS LEAD IMMEDIATELY 🔥</a></td></tr></table><p style="margin: 24px 0 0; color: #991B1B; font-size: 14px; text-align: center; font-weight: 600;">⚠️ This is a direct assignment. Your response is expected immediately!</p></td></tr><tr><td style="background-color: #1F2937; padding: 20px 30px;"><p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">Del Sol Prime Homes CRM • Priority Alert System<br><span style="color: #FCA5A5;">This is an automated urgent notification</span></p></td></tr></table></td></tr></table></body></html>`;
}

function generateAdminUnclaimedEmailHtml(lead: Lead, adminName: string, leadDetailUrl: string, roundsAttempted: number): string {
  const normalizedLead = normalizeLead(lead);
  const flag = getLanguageFlag(normalizedLead.language!);
  const segmentColor = getSegmentColor(normalizedLead.lead_segment!);
  const createdAt = lead.created_at ? new Date(lead.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>🚨 Unclaimed Lead</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(234, 88, 12, 0.2);"><tr><td style="background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); padding: 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: bold;">🚨 UNCLAIMED LEAD - MANUAL ACTION REQUIRED</h1><p style="margin: 10px 0 0; color: rgba(255,255,255,0.95); font-size: 15px; font-weight: 500;">This lead was not claimed after ${roundsAttempted} round${roundsAttempted !== 1 ? 's' : ''}</p></td></tr><tr><td style="background-color: #FED7AA; padding: 16px 30px; border-bottom: 2px solid #EA580C;"><p style="margin: 0; color: #9A3412; font-size: 15px; font-weight: 700;">⚠️ No agents claimed this lead within the claim window</p><p style="margin: 4px 0 0; color: #C2410C; font-size: 13px;">This lead has been auto-assigned to you for manual handling</p></td></tr><tr><td style="padding: 30px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px;">Hi ${adminName},</p><p style="margin: 0 0 24px; color: #374151; font-size: 16px;">A lead requires your manual intervention. Please review the details below and assign to an appropriate agent:</p><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF7ED; border-radius: 8px; border: 2px solid #FDBA74; margin-bottom: 24px;"><tr><td style="padding: 20px;"><h2 style="margin: 0 0 8px; color: #111827; font-size: 22px; font-weight: bold;">${lead.first_name} ${lead.last_name}</h2><span style="display: inline-block; background-color: ${segmentColor}; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-right: 8px;">${normalizedLead.lead_segment}</span><span style="display: inline-block; background-color: #6366F1; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px;">${flag} ${normalizedLead.language?.toUpperCase()}</span><table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;"><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p><p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${normalizedLead.phone_number}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Email</p><p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${lead.email || 'Not provided'}</p></td></tr><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Budget</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.budget_range || "Not specified"}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Property Type</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.property_type || "Not specified"}</p></td></tr><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Source</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.lead_source}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Created</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${createdAt}</p></td></tr></table></td></tr></table><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${leadDetailUrl}" style="display: inline-block; background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); color: #ffffff; font-size: 18px; font-weight: bold; text-decoration: none; padding: 18px 50px; border-radius: 10px; box-shadow: 0 6px 20px rgba(234, 88, 12, 0.4); text-transform: uppercase;">📋 View Lead & Assign Agent</a></td></tr></table><p style="margin: 24px 0 0; color: #9A3412; font-size: 14px; text-align: center; font-weight: 500;">You can assign this lead to any available agent from the lead detail page.</p></td></tr><tr><td style="background-color: #1F2937; padding: 20px 30px;"><p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">Del Sol Prime Homes CRM • Admin Fallback System<br><span style="color: #FDBA74;">This lead was auto-assigned after failing to be claimed</span></p></td></tr></table></td></tr></table></body></html>`;
}

function generateSlaWarningEmailHtml(lead: Lead, adminName: string, leadDetailUrl: string, assignedAgentName: string, timeSinceAssignment: number, slaMinutes: number): string {
  const normalizedLead = normalizeLead(lead);
  const flag = getLanguageFlag(normalizedLead.language!);
  const segmentColor = getSegmentColor(normalizedLead.lead_segment!);
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>⚠️ SLA Warning</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);"><tr><td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: bold;">⚠️ SLA WARNING - LEAD NOT WORKED</h1><p style="margin: 10px 0 0; color: rgba(255,255,255,0.95); font-size: 15px; font-weight: 500;">This lead was claimed but has not received any activity</p></td></tr><tr><td style="background-color: #FEF3C7; padding: 16px 30px; border-bottom: 2px solid #F59E0B;"><p style="margin: 0; color: #92400E; font-size: 15px; font-weight: 700;">⏱️ SLA window of ${slaMinutes} minutes has been exceeded</p><p style="margin: 4px 0 0; color: #B45309; font-size: 13px;">Lead has been assigned for ${timeSinceAssignment} minutes with no activity logged</p></td></tr><tr><td style="padding: 30px;"><p style="margin: 0 0 20px; color: #374151; font-size: 16px;">Hi ${adminName},</p><p style="margin: 0 0 24px; color: #374151; font-size: 16px;">A lead claimed by <strong>${assignedAgentName}</strong> has exceeded the SLA window without any activity being logged. The lead remains assigned to the agent, but you may want to follow up:</p><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFBEB; border-radius: 8px; border: 2px solid #FCD34D; margin-bottom: 24px;"><tr><td style="padding: 20px;"><h2 style="margin: 0 0 8px; color: #111827; font-size: 22px; font-weight: bold;">${lead.first_name} ${lead.last_name}</h2><span style="display: inline-block; background-color: ${segmentColor}; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-right: 8px;">${normalizedLead.lead_segment}</span><span style="display: inline-block; background-color: #6366F1; color: white; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px;">${flag} ${normalizedLead.language?.toUpperCase()}</span><table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;"><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Phone</p><p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${normalizedLead.phone_number}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Email</p><p style="margin: 4px 0 0; color: #111827; font-size: 15px; font-weight: 600;">${lead.email || 'Not provided'}</p></td></tr><tr><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Budget</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${lead.budget_range || "Not specified"}</p></td><td width="50%" style="padding: 8px 0;"><p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Source</p><p style="margin: 4px 0 0; color: #111827; font-size: 14px; font-weight: 500;">${normalizedLead.lead_source}</p></td></tr><tr><td colspan="2" style="padding: 12px 0 0 0; border-top: 1px dashed #FCD34D; margin-top: 8px;"><p style="margin: 0; color: #92400E; font-size: 13px;"><strong>Assigned Agent:</strong> ${assignedAgentName}</p><p style="margin: 4px 0 0; color: #92400E; font-size: 13px;"><strong>Time Since Assignment:</strong> ${timeSinceAssignment} minutes</p></td></tr></table></td></tr></table><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${leadDetailUrl}" style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #ffffff; font-size: 18px; font-weight: bold; text-decoration: none; padding: 18px 50px; border-radius: 10px; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);">📋 View Lead Details</a></td></tr></table><p style="margin: 24px 0 0; color: #92400E; font-size: 14px; text-align: center; font-weight: 500;">The lead remains with ${assignedAgentName}. You may choose to reassign manually if needed.</p></td></tr><tr><td style="background-color: #1F2937; padding: 20px 30px;"><p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">Del Sol Prime Homes CRM • SLA Monitoring System<br><span style="color: #FCD34D;">This is an automated SLA warning notification</span></p></td></tr></table></td></tr></table></body></html>`;
}

// Log email to database for audit trail
async function logEmail(
  supabase: any,
  params: {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    templateType: string;
    leadId: string;
    agentId: string;
    triggeredBy: string;
    triggerReason: string;
    status: 'sent' | 'failed';
    errorMessage?: string;
    resendMessageId?: string;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from('crm_email_logs').insert({
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      template_type: params.templateType,
      lead_id: params.leadId,
      agent_id: params.agentId,
      triggered_by: params.triggeredBy,
      trigger_reason: params.triggerReason,
      status: params.status,
      error_message: params.errorMessage || null,
      resend_message_id: params.resendMessageId || null,
    });

    if (error) {
      console.error('[send-lead-notification] Failed to log email:', error);
    } else {
      console.log(`[send-lead-notification] Email logged: ${params.templateType} to ${params.recipientEmail}`);
    }
  } catch (err) {
    console.error('[send-lead-notification] Error logging email:', err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-lead-notification] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead, agents, claimWindowMinutes, notification_type, lead_priority, assigned_agent_name, time_since_assignment_minutes, triggered_by, trigger_reason }: NotificationRequest = await req.json();
    console.log(`[send-lead-notification] Sending email notifications to ${agents.length} agents for lead ${lead.id}, type: ${notification_type || 'broadcast'}`);

    const appUrl = Deno.env.get("APP_URL") || "https://blog-knowledge-vault.lovable.app";
    const results: Array<{ agent: string; emailSuccess: boolean; emailType?: 'standard' | 'urgent' | 'admin_unclaimed' | 'sla_warning'; error?: string }> = [];

    const isSlaWarningNotification = notification_type === 'sla_warning';
    const isAdminUnclaimedNotification = notification_type === 'admin_unclaimed';
    const isUrgentNotification = notification_type === 'direct_assignment' || notification_type === 'sla_escalation' || notification_type === 'test_urgent' || lead_priority === 'urgent';

    // Determine triggered_by source
    const triggeredBySource = triggered_by || 'send-lead-notification';
    
    for (const agent of agents) {
      const claimUrl = `${appUrl}/crm/agent/leads/${lead.id}/claim`;
      const leadDetailUrl = `${appUrl}/crm/agent/leads/${lead.id}`;
      let emailSuccess = false;
      let resendMessageId: string | undefined;
      let errorMessage: string | undefined;
      
      const useAdminUnclaimedTemplate = isAdminUnclaimedNotification;
      const useSlaWarningTemplate = isSlaWarningNotification;
      const useUrgentTemplate = !useAdminUnclaimedTemplate && !useSlaWarningTemplate && isUrgentNotification && agent.urgent_emails_enabled !== false;
      const emailType = useSlaWarningTemplate ? 'sla_warning' : (useAdminUnclaimedTemplate ? 'admin_unclaimed' : (useUrgentTemplate ? 'urgent' : 'standard'));

      const normalizedLead = normalizeLead(lead);
      const flag = getLanguageFlag(normalizedLead.language!);

      // Determine template type for logging
      const templateType = notification_type || (useUrgentTemplate ? 'urgent' : 'broadcast');

      // Build trigger reason if not provided
      let reasonText = trigger_reason;
      if (!reasonText) {
        if (useSlaWarningTemplate) {
          reasonText = `SLA breach - no activity after ${time_since_assignment_minutes || claimWindowMinutes} minutes`;
        } else if (useAdminUnclaimedTemplate) {
          reasonText = `Lead unclaimed after ${lead.current_round || 1} round(s)`;
        } else if (useUrgentTemplate) {
          reasonText = `Urgent ${notification_type || 'priority'} notification`;
        } else {
          reasonText = `New ${normalizedLead.language?.toUpperCase()} lead - Round ${lead.current_round || 1} (${claimWindowMinutes} min window)`;
        }
      }

      let emailSubject: string;

      try {
        let emailHtml: string;
        if (useSlaWarningTemplate) {
          emailHtml = generateSlaWarningEmailHtml(
            lead, 
            agent.first_name, 
            leadDetailUrl, 
            assigned_agent_name || 'Unknown Agent',
            time_since_assignment_minutes || claimWindowMinutes,
            claimWindowMinutes
          );
        } else if (useAdminUnclaimedTemplate) {
          emailHtml = generateAdminUnclaimedEmailHtml(lead, agent.first_name, leadDetailUrl, lead.current_round || 1);
        } else if (useUrgentTemplate) {
          emailHtml = generateUrgentEmailHtml(lead, agent.first_name, claimUrl, claimWindowMinutes, notification_type || 'urgent');
        } else {
          emailHtml = generateEmailHtml(lead, agent.first_name, claimUrl, claimWindowMinutes);
        }

        if (useSlaWarningTemplate) {
          emailSubject = `⚠️ SLA Warning: ${lead.first_name} ${lead.last_name} not worked by ${assigned_agent_name || 'Agent'}`;
        } else if (useAdminUnclaimedTemplate) {
          emailSubject = `🚨 UNCLAIMED: ${lead.first_name} ${lead.last_name} - Manual Assignment Required`;
        } else if (useUrgentTemplate) {
          emailSubject = `🔥 URGENT LEAD: ${lead.first_name} ${lead.last_name} - ${lead.budget_range || 'Action Required'}`;
        } else {
          emailSubject = `${flag} New ${normalizedLead.language?.toUpperCase()} Lead: ${lead.first_name} ${lead.last_name}`;
        }

        const emailPayload: Record<string, unknown> = {
          from: "Del Sol Prime Homes <crm@notifications.delsolprimehomes.com>",
          to: [agent.email],
          subject: emailSubject,
          html: emailHtml,
        };

        if (useUrgentTemplate) {
          emailPayload.headers = { "X-Priority": "1", "X-MSMail-Priority": "High", "Importance": "high" };
        }

        const emailResponse = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
          body: JSON.stringify(emailPayload),
        });

        emailSuccess = emailResponse.ok;
        
        if (emailSuccess) {
          try {
            const responseData = await emailResponse.json();
            resendMessageId = responseData.id;
          } catch {
            // Response might not be JSON
          }
        } else {
          try {
            const errorData = await emailResponse.text();
            errorMessage = errorData.substring(0, 500);
          } catch {
            errorMessage = `HTTP ${emailResponse.status}`;
          }
        }

        console.log(`[send-lead-notification] ${emailType} email sent to ${agent.email}:`, emailSuccess);
      } catch (emailError: unknown) {
        console.error(`[send-lead-notification] Failed to send email to ${agent.email}:`, emailError);
        errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      }

      // Log the email to database
      await logEmail(supabase, {
        recipientEmail: agent.email,
        recipientName: `${agent.first_name} ${agent.last_name}`,
        subject: emailSubject!,
        templateType,
        leadId: lead.id,
        agentId: agent.id,
        triggeredBy: triggeredBySource,
        triggerReason: reasonText,
        status: emailSuccess ? 'sent' : 'failed',
        errorMessage,
        resendMessageId,
      });

      results.push({ agent: agent.email, emailSuccess, emailType });
    }

    const emailSuccessCount = results.filter(r => r.emailSuccess).length;
    const urgentEmailCount = results.filter(r => r.emailType === 'urgent').length;
    const slaWarningCount = results.filter(r => r.emailType === 'sla_warning').length;
    console.log(`[send-lead-notification] Summary: ${emailSuccessCount}/${agents.length} emails sent (${urgentEmailCount} urgent, ${slaWarningCount} SLA warnings)`);

    return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[send-lead-notification] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
