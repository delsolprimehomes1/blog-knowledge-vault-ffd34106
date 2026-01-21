import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAgent } from "@/hooks/useCrmAgents";
import { useSlackChannels, useUpdateAgentSlackChannels, SlackChannel } from "@/hooks/useSlackChannels";
import { SlackChannelSelector } from "@/components/crm/SlackChannelSelector";
import {
  agentFormSchema,
  AgentFormData,
  SUPPORTED_LANGUAGES,
  TIMEZONES,
} from "@/lib/crm-validations";
import { Loader2 } from "lucide-react";

interface AddAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAgentModal({ open, onOpenChange }: AddAgentModalProps) {
  const createAgent = useCreateAgent();
  const updateAgentSlackChannels = useUpdateAgentSlackChannels();
  const { data: allChannels = [] } = useSlackChannels();
  
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [selectedSlackChannels, setSelectedSlackChannels] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      role: "agent",
      languages: ["en"],
      max_active_leads: 50,
      email_notifications: true,
      timezone: "Europe/Madrid",
    },
  });

  const emailNotifications = watch("email_notifications");

  const toggleLanguage = (code: string) => {
    const updated = selectedLanguages.includes(code)
      ? selectedLanguages.filter((l) => l !== code)
      : [...selectedLanguages, code];
    setSelectedLanguages(updated);
    setValue("languages", updated);
  };

  const handleSlackChannelsChange = (channelIds: string[], channels: SlackChannel[]) => {
    setSelectedSlackChannels(channelIds);
  };

  const onSubmit = async (data: AgentFormData) => {
    try {
      const result = await createAgent.mutateAsync({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
        languages: selectedLanguages,
        max_active_leads: data.max_active_leads,
        slack_channel_id: data.slack_channel_id,
        email_notifications: data.email_notifications,
        timezone: data.timezone,
      });

      // If agent was created and Slack is enabled, assign channels
      if (result?.agentId && slackEnabled && selectedSlackChannels.length > 0) {
        await updateAgentSlackChannels.mutateAsync({
          agentId: result.agentId,
          channelIds: selectedSlackChannels,
          channels: allChannels,
        });
      }

      reset();
      setSelectedLanguages(["en"]);
      setSlackEnabled(false);
      setSelectedSlackChannels([]);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                {...register("first_name")}
                placeholder="John"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                {...register("last_name")}
                placeholder="Doe"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="agent@delsolprimehomes.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="+34 600 000 000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="Min. 8 characters"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role *</Label>
            <Select
              defaultValue="agent"
              onValueChange={(value: "agent" | "admin") => setValue("role", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Languages *</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`lang-${lang.code}`}
                    checked={selectedLanguages.includes(lang.code)}
                    onCheckedChange={() => toggleLanguage(lang.code)}
                  />
                  <Label htmlFor={`lang-${lang.code}`} className="cursor-pointer flex items-center gap-1">
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm">{lang.name}</span>
                  </Label>
                </div>
              ))}
            </div>
            {errors.languages && (
              <p className="text-sm text-destructive">{errors.languages.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_active_leads">Max Active Leads</Label>
              <Input
                id="max_active_leads"
                type="number"
                {...register("max_active_leads", { valueAsNumber: true })}
                defaultValue={50}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                defaultValue="Europe/Madrid"
                onValueChange={(value) => setValue("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4 pt-2 border-t">
            <h4 className="font-medium text-sm">Notification Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_notifications" className="cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive lead alerts via email
                </p>
              </div>
              <Switch
                id="email_notifications"
                checked={emailNotifications}
                onCheckedChange={(checked) => setValue("email_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="slack_notifications" className="cursor-pointer">
                  Slack Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive lead alerts in Slack channels
                </p>
              </div>
              <Switch
                id="slack_notifications"
                checked={slackEnabled}
                onCheckedChange={setSlackEnabled}
              />
            </div>

            {slackEnabled && (
              <SlackChannelSelector
                selectedChannelIds={selectedSlackChannels}
                onChannelsChange={handleSlackChannelsChange}
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createAgent.isPending}>
              {createAgent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Agent"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
