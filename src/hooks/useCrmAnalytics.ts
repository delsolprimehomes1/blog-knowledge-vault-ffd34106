import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export type DateRange = "7d" | "30d" | "all";

interface LanguageData {
  language: string;
  count: number;
  fill: string;
}

interface SourceData {
  source: string;
  count: number;
}

interface AgentPerformance {
  id: string;
  name: string;
  leadsClaimed: number;
  closedWon: number;
  slaBreaches: number;
  responseRate: number;
}

export interface CrmAnalytics {
  totalLeads: number;
  conversionRate: number;
  avgResponseTimeHours: number;
  slaBreachRate: number;
  leadsByLanguage: LanguageData[];
  leadsBySource: SourceData[];
  agentPerformance: AgentPerformance[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  en: "hsl(221, 83%, 53%)",
  fr: "hsl(173, 80%, 40%)",
  nl: "hsl(25, 95%, 53%)",
  de: "hsl(280, 65%, 60%)",
  es: "hsl(142, 71%, 45%)",
  fi: "hsl(340, 75%, 55%)",
  it: "hsl(45, 93%, 47%)",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "🇬🇧 English",
  fr: "🇫🇷 French",
  nl: "🇳🇱 Dutch",
  de: "🇩🇪 German",
  es: "🇪🇸 Spanish",
  fi: "🇫🇮 Finnish",
  it: "🇮🇹 Italian",
};

const SOURCE_LABELS: Record<string, string> = {
  emma_chatbot: "Emma Chatbot",
  landing_form: "Landing Form",
  property_inquiry: "Property Inquiry",
  contact_form: "Contact Form",
  manual: "Manual Entry",
};

export function useCrmAnalytics(range: DateRange = "30d") {
  return useQuery({
    queryKey: ["crm-analytics", range],
    queryFn: async (): Promise<CrmAnalytics> => {
      const now = new Date();
      let cutoff: Date | null = null;

      if (range === "7d") {
        cutoff = subDays(now, 7);
      } else if (range === "30d") {
        cutoff = subDays(now, 30);
      }

      // Fetch leads
      let leadsQuery = supabase
        .from("crm_leads")
        .select("id, language, lead_source, lead_status, sla_breached, first_contact_at, created_at, assigned_agent_id, lead_claimed")
        .eq("archived", false);

      if (cutoff) {
        leadsQuery = leadsQuery.gte("created_at", cutoff.toISOString());
      }

      const { data: leads, error: leadsError } = await leadsQuery;
      if (leadsError) throw leadsError;

      // Fetch agents
      const { data: agents, error: agentsError } = await supabase
        .from("crm_agents")
        .select("id, first_name, last_name")
        .eq("is_active", true);

      if (agentsError) throw agentsError;

      // Calculate key metrics
      const totalLeads = leads?.length || 0;
      const closedWonCount = leads?.filter(l => l.lead_status === "closed_won").length || 0;
      const slaBreachedCount = leads?.filter(l => l.sla_breached).length || 0;

      const conversionRate = totalLeads > 0 ? (closedWonCount / totalLeads) * 100 : 0;
      const slaBreachRate = totalLeads > 0 ? (slaBreachedCount / totalLeads) * 100 : 0;

      // Calculate average response time
      const leadsWithResponse = leads?.filter(l => l.first_contact_at && l.created_at) || [];
      const totalResponseMs = leadsWithResponse.reduce((sum, l) => {
        const created = new Date(l.created_at!).getTime();
        const contacted = new Date(l.first_contact_at!).getTime();
        return sum + (contacted - created);
      }, 0);
      const avgResponseTimeHours = leadsWithResponse.length > 0
        ? totalResponseMs / leadsWithResponse.length / (1000 * 60 * 60)
        : 0;

      // Aggregate by language
      const languageCounts = (leads || []).reduce((acc, lead) => {
        const lang = lead.language || "en";
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const leadsByLanguage: LanguageData[] = Object.entries(languageCounts)
        .map(([language, count]) => ({
          language,
          count,
          fill: LANGUAGE_COLORS[language] || "hsl(var(--muted))",
        }))
        .sort((a, b) => b.count - a.count);

      // Aggregate by source
      const sourceCounts = (leads || []).reduce((acc, lead) => {
        const source = lead.lead_source || "manual";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const leadsBySource: SourceData[] = Object.entries(sourceCounts)
        .map(([source, count]) => ({
          source: SOURCE_LABELS[source] || source,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate agent performance
      const agentPerformance: AgentPerformance[] = (agents || []).map(agent => {
        const agentLeads = leads?.filter(l => l.assigned_agent_id === agent.id) || [];
        const claimed = agentLeads.filter(l => l.lead_claimed).length;
        const closedWon = agentLeads.filter(l => l.lead_status === "closed_won").length;
        const slaBreaches = agentLeads.filter(l => l.sla_breached).length;
        const withResponse = agentLeads.filter(l => l.first_contact_at).length;
        const responseRate = agentLeads.length > 0 ? (withResponse / agentLeads.length) * 100 : 0;

        return {
          id: agent.id,
          name: `${agent.first_name} ${agent.last_name}`,
          leadsClaimed: claimed,
          closedWon,
          slaBreaches,
          responseRate,
        };
      }).filter(a => a.leadsClaimed > 0).sort((a, b) => b.leadsClaimed - a.leadsClaimed);

      return {
        totalLeads,
        conversionRate,
        avgResponseTimeHours,
        slaBreachRate,
        leadsByLanguage,
        leadsBySource,
        agentPerformance,
      };
    },
    staleTime: 60_000, // 1 minute
  });
}

export { LANGUAGE_LABELS };
