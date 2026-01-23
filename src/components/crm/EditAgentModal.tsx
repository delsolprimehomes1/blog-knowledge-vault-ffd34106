import { useState, useEffect } from "react";
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
import { useUpdateAgent, CrmAgent } from "@/hooks/useCrmAgents";
import {
  editAgentFormSchema,
  EditAgentFormData,
  SUPPORTED_LANGUAGES,
  TIMEZONES,
} from "@/lib/crm-validations";
import { Loader2 } from "lucide-react";

interface EditAgentModalProps {
  agent: CrmAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAgentModal({ agent, open, onOpenChange }: EditAgentModalProps) {
  const updateAgent = useUpdateAgent();
  
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [urgentEmailsEnabled, setUrgentEmailsEnabled] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditAgentFormData>({
    resolver: zodResolver(editAgentFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "agent",
      languages: [],
      max_active_leads: 100,
      email_notifications: true,
      timezone: "Europe/Madrid",
    },
  });

  const emailNotifications = watch("email_notifications") ?? true;
  const currentRole = watch("role") ?? "agent";
  const currentTimezone = watch("timezone") ?? "Europe/Madrid";

  useEffect(() => {
    if (agent && open) {
      reset({
        first_name: agent.first_name,
        last_name: agent.last_name,
        email: agent.email,
        phone: agent.phone || "",
        role: agent.role as "agent" | "admin",
        languages: agent.languages,
        max_active_leads: agent.max_active_leads,
        email_notifications: agent.email_notifications,
        timezone: agent.timezone,
      });
      setSelectedLanguages(agent.languages);
      setUrgentEmailsEnabled(agent.urgent_emails_enabled !== false);
    }
  }, [agent, open, reset]);

  const toggleLanguage = (code: string) => {
    const updated = selectedLanguages.includes(code)
      ? selectedLanguages.filter((l) => l !== code)
      : [...selectedLanguages, code];
    setSelectedLanguages(updated);
    setValue("languages", updated);
  };

  const onSubmit = async (data: EditAgentFormData) => {
    if (!agent) return;

    try {
      const updateData: Partial<CrmAgent> = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        role: data.role,
        languages: selectedLanguages,
        max_active_leads: data.max_active_leads,
        email_notifications: data.email_notifications,
        timezone: data.timezone,
        urgent_emails_enabled: urgentEmailsEnabled,
      };

      await updateAgent.mutateAsync({ id: agent.id, data: updateData });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label>Role *</Label>
            <Select
              value={currentRole}
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
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => toggleLanguage(lang.code)}
                >
                  <Checkbox
                    checked={selectedLanguages.includes(lang.code)}
                    onCheckedChange={() => toggleLanguage(lang.code)}
                  />
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
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
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={currentTimezone}
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
                <Label htmlFor="urgent_emails" className="cursor-pointer">
                  Receive Urgent Email Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  High-priority emails for direct-assigned and urgent leads
                </p>
              </div>
              <Switch
                id="urgent_emails"
                checked={urgentEmailsEnabled}
                onCheckedChange={setUrgentEmailsEnabled}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateAgent.isPending}>
              {updateAgent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
