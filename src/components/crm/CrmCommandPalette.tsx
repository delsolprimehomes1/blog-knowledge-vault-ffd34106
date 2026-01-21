import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  FileText,
  Calendar,
  LayoutDashboard,
  Users,
  Bell,
  Search,
  User,
  Clock,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAgentLeads } from '@/hooks/useAgentDashboard';
import { getLanguageFlag, STATUS_COLORS } from '@/lib/crm-conditional-styles';
import { cn } from '@/lib/utils';

interface CrmCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogCall?: () => void;
  onAddNote?: () => void;
  onSetReminder?: () => void;
}

export function CrmCommandPalette({
  open,
  onOpenChange,
  onLogCall,
  onAddNote,
  onSetReminder,
}: CrmCommandPaletteProps) {
  const navigate = useNavigate();
  const { data: leads } = useAgentLeads();
  const [search, setSearch] = useState('');

  // Filter leads based on search
  const filteredLeads = leads?.filter(lead => {
    if (!search) return false;
    const searchLower = search.toLowerCase();
    return (
      lead.first_name.toLowerCase().includes(searchLower) ||
      lead.last_name.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.phone_number?.includes(search)
    );
  }).slice(0, 5);

  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
    setSearch('');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Type a command or search leads..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect(() => onLogCall?.())}>
            <Phone className="mr-2 h-4 w-4 text-green-600" />
            <span>Log Call</span>
            <CommandShortcut>⌘L</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onAddNote?.())}>
            <FileText className="mr-2 h-4 w-4 text-blue-600" />
            <span>Add Note</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onSetReminder?.())}>
            <Clock className="mr-2 h-4 w-4 text-amber-600" />
            <span>Set Reminder</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => {})}>
            <MessageSquare className="mr-2 h-4 w-4 text-purple-600" />
            <span>Send WhatsApp</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Leads Search Results */}
        {filteredLeads && filteredLeads.length > 0 && (
          <>
            <CommandGroup heading="Leads">
              {filteredLeads.map(lead => (
                <CommandItem
                  key={lead.id}
                  onSelect={() => handleSelect(() => navigate(`/crm/agent/leads/${lead.id}`))}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="mr-1">{getLanguageFlag(lead.language)}</span>
                    <span>{lead.first_name} {lead.last_name}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn('ml-auto text-xs', STATUS_COLORS[lead.lead_status as keyof typeof STATUS_COLORS])}
                  >
                    {lead.lead_status.replace(/_/g, ' ')}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/agent/dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/agent/leads'))}>
            <Users className="mr-2 h-4 w-4" />
            <span>My Leads</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/agent/calendar'))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/agent/notifications'))}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Filters */}
        <CommandGroup heading="Quick Filters">
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/agent/leads?status=new'))}>
            <Search className="mr-2 h-4 w-4 text-blue-600" />
            <span>Show New Leads</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/agent/dashboard?filter=overdue'))}>
            <Search className="mr-2 h-4 w-4 text-red-600" />
            <span>Show Overdue Callbacks</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/agent/leads?status=qualified'))}>
            <Search className="mr-2 h-4 w-4 text-green-600" />
            <span>Show Qualified Leads</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/agent/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/crm/login'))}>
            <LogOut className="mr-2 h-4 w-4 text-red-600" />
            <span>Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
