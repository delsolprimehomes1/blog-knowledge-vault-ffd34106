// CRM Conditional Styling Utilities
// Color system with semantic meaning for the Airtable-inspired dashboard

import { differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";

// Lead status colors
export const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  contacted: 'bg-gray-100 text-gray-800 border-gray-200',
  qualified: 'bg-green-100 text-green-800 border-green-200',
  nurture: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  showing_scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
  offer_pending: 'bg-orange-100 text-orange-800 border-orange-200',
  closed_won: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed_lost: 'bg-red-100 text-red-800 border-red-200',
  not_interested: 'bg-gray-100 text-gray-800 border-gray-200',
} as const;

// Urgency levels for callbacks
export type UrgencyLevel = 'overdue' | 'urgent' | 'soon' | 'normal';

export const getCallbackUrgency = (dueDate: Date | string): UrgencyLevel => {
  const target = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const minutesUntil = differenceInMinutes(target, new Date());
  
  if (minutesUntil < 0) return 'overdue';
  if (minutesUntil < 60) return 'urgent';
  if (minutesUntil < 240) return 'soon';
  return 'normal';
};

export const URGENCY_STYLES = {
  overdue: {
    row: 'bg-red-50 border-l-4 border-red-500',
    text: 'text-red-600 font-semibold',
    badge: 'bg-red-500 text-white animate-pulse',
  },
  urgent: {
    row: 'bg-amber-50 border-l-4 border-amber-500',
    text: 'text-amber-600 font-semibold',
    badge: 'bg-amber-500 text-white',
  },
  soon: {
    row: 'bg-orange-50 border-l-4 border-orange-500',
    text: 'text-orange-600',
    badge: 'bg-orange-500 text-white',
  },
  normal: {
    row: 'bg-white hover:bg-gray-50',
    text: 'text-gray-600',
    badge: 'bg-gray-500 text-white',
  },
} as const;

// Extended urgency levels for calendar system
export type ExtendedUrgencyLevel = 
  | 'overdue' 
  | 'critical' 
  | 'urgent' 
  | 'warning' 
  | 'today' 
  | 'upcoming' 
  | 'scheduled';

export const getExtendedUrgency = (datetime: Date | string): ExtendedUrgencyLevel => {
  const target = typeof datetime === 'string' ? new Date(datetime) : datetime;
  const now = new Date();
  const minutesUntil = differenceInMinutes(target, now);
  const hoursUntil = minutesUntil / 60;
  const daysUntil = hoursUntil / 24;
  
  if (minutesUntil < 0) return 'overdue';
  if (minutesUntil < 30) return 'critical';
  if (minutesUntil < 60) return 'urgent';
  if (hoursUntil < 4) return 'warning';
  if (daysUntil < 1) return 'today';
  if (daysUntil < 7) return 'upcoming';
  return 'scheduled';
};

export const EXTENDED_URGENCY_STYLES = {
  overdue: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-700',
    badge: 'bg-red-500 text-white animate-pulse',
    dot: 'bg-red-500',
    hex: '#EF4444',
  },
  critical: {
    bg: 'bg-orange-100',
    border: 'border-orange-600',
    text: 'text-orange-700',
    badge: 'bg-orange-600 text-white',
    dot: 'bg-orange-600',
    hex: '#DC2626',
  },
  urgent: {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    text: 'text-orange-600',
    badge: 'bg-orange-500 text-white',
    dot: 'bg-orange-500',
    hex: '#F97316',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-600',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
    hex: '#F59E0B',
  },
  today: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-700',
    badge: 'bg-yellow-500 text-white',
    dot: 'bg-yellow-500',
    hex: '#FACC15',
  },
  upcoming: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-600',
    badge: 'bg-green-500 text-white',
    dot: 'bg-green-500',
    hex: '#10B981',
  },
  scheduled: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-600',
    badge: 'bg-blue-500 text-white',
    dot: 'bg-blue-500',
    hex: '#3B82F6',
  },
} as const;

export const REMINDER_TYPE_CONFIG = {
  callback: { icon: '📞', label: 'Callback', color: 'bg-blue-100 text-blue-700' },
  follow_up: { icon: '📧', label: 'Follow-up', color: 'bg-purple-100 text-purple-700' },
  viewing: { icon: '🏠', label: 'Viewing', color: 'bg-green-100 text-green-700' },
  meeting: { icon: '🤝', label: 'Meeting', color: 'bg-amber-100 text-amber-700' },
  deadline: { icon: '⏰', label: 'Deadline', color: 'bg-red-100 text-red-700' },
} as const;

// Lead age warning (time since created)
export type LeadAgeLevel = 'brand-new' | 'fresh' | 'aging' | 'stale';

export const getLeadAge = (createdAt: Date | string): LeadAgeLevel => {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const hours = differenceInHours(new Date(), created);
  
  if (hours < 1) return 'brand-new';
  if (hours < 6) return 'fresh';
  if (hours < 24) return 'aging';
  return 'stale';
};

export const LEAD_AGE_STYLES = {
  'brand-new': {
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    text: 'Brand new!',
  },
  fresh: {
    color: 'text-green-600',
    bg: 'bg-green-100',
    text: 'Fresh',
  },
  aging: {
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    text: 'Aging',
  },
  stale: {
    color: 'text-red-600',
    bg: 'bg-red-100',
    text: 'Needs attention!',
  },
} as const;

// Days since last contact
export type ContactSeverity = 'good' | 'warning' | 'urgent' | 'critical';

export const getContactWarning = (lastContactAt: Date | string | null): { severity: ContactSeverity; message: string } => {
  if (!lastContactAt) {
    return { severity: 'critical', message: 'Never contacted!' };
  }
  
  const lastContact = typeof lastContactAt === 'string' ? new Date(lastContactAt) : lastContactAt;
  const daysSince = differenceInDays(new Date(), lastContact);
  
  if (daysSince === 0) return { severity: 'good', message: 'Contacted today' };
  if (daysSince === 1) return { severity: 'good', message: 'Contacted yesterday' };
  if (daysSince <= 3) return { severity: 'warning', message: `${daysSince} days ago` };
  if (daysSince <= 7) return { severity: 'urgent', message: `${daysSince} days ago` };
  return { severity: 'critical', message: `${daysSince} days ago!` };
};

export const CONTACT_SEVERITY_STYLES = {
  good: 'text-green-600 bg-green-100',
  warning: 'text-amber-600 bg-amber-100',
  urgent: 'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100 font-semibold',
} as const;

// Metric card conditional styling
export const getNewLeadsCardStyle = (count: number) => {
  if (count === 0) return 'border-gray-200';
  if (count > 5) return 'border-red-500 shadow-red-100';
  if (count > 2) return 'border-amber-500 shadow-amber-100';
  return 'border-blue-500 shadow-blue-100';
};

export const getCallbacksCardStyle = (nextCallbackMinutes: number) => {
  if (nextCallbackMinutes < 0) return 'border-red-500 shadow-red-100 animate-pulse';
  if (nextCallbackMinutes < 60) return 'border-amber-500 shadow-amber-100';
  return 'border-green-500 shadow-green-100';
};

export const getResponseRateStyle = (rate: number) => {
  if (rate >= 80) return 'text-green-600 bg-green-100';
  if (rate >= 50) return 'text-amber-600 bg-amber-100';
  return 'text-red-600 bg-red-100';
};

// Lead segment colors
export const SEGMENT_COLORS = {
  hot: 'bg-red-100 text-red-800 border-red-200',
  warm: 'bg-orange-100 text-orange-800 border-orange-200',
  cold: 'bg-blue-100 text-blue-800 border-blue-200',
  premium: 'bg-purple-100 text-purple-800 border-purple-200',
} as const;

// Timeframe urgency
export const TIMEFRAME_STYLES = {
  immediate: 'bg-red-100 text-red-800',
  '1-3_months': 'bg-orange-100 text-orange-800',
  '3-6_months': 'bg-yellow-100 text-yellow-800',
  '6-12_months': 'bg-blue-100 text-blue-800',
  '12+_months': 'bg-gray-100 text-gray-800',
} as const;

// Language flags
export const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  nl: '🇳🇱',
  fi: '🇫🇮',
  pl: '🇵🇱',
  sv: '🇸🇪',
  da: '🇩🇰',
  hu: '🇭🇺',
  no: '🇳🇴',
};

export const getLanguageFlag = (lang: string): string => {
  return LANGUAGE_FLAGS[lang.toLowerCase()] || '🌐';
};

// Call outcome styles
export const CALL_OUTCOME_STYLES = {
  answered: { icon: 'Phone', color: 'bg-green-100 text-green-600', label: 'Answered' },
  no_answer: { icon: 'PhoneMissed', color: 'bg-amber-100 text-amber-600', label: 'No Answer' },
  voicemail: { icon: 'Voicemail', color: 'bg-blue-100 text-blue-600', label: 'Voicemail' },
  busy: { icon: 'PhoneOff', color: 'bg-gray-100 text-gray-600', label: 'Busy' },
  wrong_number: { icon: 'XCircle', color: 'bg-red-100 text-red-600', label: 'Wrong Number' },
  not_interested: { icon: 'ThumbsDown', color: 'bg-gray-100 text-gray-600', label: 'Not Interested' },
} as const;

// ============================================
// Lead Row Conditional Styling (Airtable-style)
// ============================================

export const getLeadRowStyle = (lead: {
  lead_status: string;
  created_at: string;
  last_contact_at: string | null;
  days_since_last_contact: number | null;
}): string => {
  const hoursOld = differenceInHours(new Date(), new Date(lead.created_at));
  const daysSinceContact = lead.days_since_last_contact;

  // New lead not contacted for 24+ hours - RED (urgent)
  if (lead.lead_status === 'new' && hoursOld > 24) {
    return 'bg-red-50 border-l-4 border-red-500 hover:bg-red-100';
  }

  // Not contacted in 5+ days - AMBER (warning)
  if (daysSinceContact !== null && daysSinceContact > 5) {
    return 'bg-amber-50 border-l-4 border-amber-500 hover:bg-amber-100';
  }

  // Recently contacted today - GREEN (good)
  if (daysSinceContact === 0) {
    return 'bg-green-50 border-l-4 border-green-500 hover:bg-green-100';
  }

  // Newly assigned (< 6 hours) - BLUE (fresh)
  if (hoursOld < 6) {
    return 'bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100';
  }

  // Not interested / archived - GRAY (inactive)
  if (lead.lead_status === 'not_interested') {
    return 'bg-gray-100 opacity-60 hover:bg-gray-200';
  }

  return 'hover:bg-muted/50';
};

// Priority icon configurations
export const PRIORITY_CONFIG = {
  urgent: { icon: 'Flame', color: 'text-red-500', animation: 'animate-pulse', bg: 'bg-red-50' },
  high: { icon: 'Star', color: 'text-orange-500', animation: '', bg: 'bg-orange-50' },
  medium: { icon: 'Circle', color: 'text-yellow-500', animation: '', bg: 'bg-yellow-50' },
  low: { icon: 'Minus', color: 'text-gray-400', animation: '', bg: 'bg-gray-50' },
} as const;

// Status badge styling with proper colors
export const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    contacted: 'bg-gray-100 text-gray-800 border-gray-200',
    qualified: 'bg-green-100 text-green-800 border-green-200',
    nurture: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    showing_scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
    offer_pending: 'bg-orange-100 text-orange-800 border-orange-200',
    closed_won: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    closed_lost: 'bg-red-100 text-red-800 border-red-200',
    not_interested: 'bg-gray-100 text-gray-500 border-gray-200 line-through',
  };
  return classes[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// Segment badge styling for quick visual distinction
export const SEGMENT_BADGE_STYLES = {
  Hot: 'bg-red-500 text-white',
  Hot_Investor: 'bg-red-500 text-white',
  Warm: 'bg-orange-500 text-white',
  Warm_Family: 'bg-orange-500 text-white',
  Cool: 'bg-blue-500 text-white',
  Cool_Holiday: 'bg-blue-500 text-white',
  Cold: 'bg-gray-500 text-white',
  Cold_General: 'bg-gray-500 text-white',
} as const;

// Get segment display style
export const getSegmentStyle = (segment: string): string => {
  if (segment.includes('Hot')) return SEGMENT_BADGE_STYLES.Hot;
  if (segment.includes('Warm')) return SEGMENT_BADGE_STYLES.Warm;
  if (segment.includes('Cool')) return SEGMENT_BADGE_STYLES.Cool;
  return SEGMENT_BADGE_STYLES.Cold;
};

// All available statuses for filtering/selection
export const ALL_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'nurture',
  'showing_scheduled',
  'offer_pending',
  'closed_won',
  'closed_lost',
  'not_interested',
] as const;

// All available segments
export const ALL_SEGMENTS = [
  'Hot_Investor',
  'Warm_Family',
  'Cool_Holiday',
  'Cold_General',
] as const;

// All available priorities
export const ALL_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;

// Format status for display
export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// Format segment for display
export const formatSegment = (segment: string): string => {
  return segment.replace(/_/g, ' ');
};
