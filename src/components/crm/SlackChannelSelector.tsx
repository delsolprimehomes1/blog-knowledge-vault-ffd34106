import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Hash, Loader2, AlertCircle } from "lucide-react";
import {
  useSlackChannels,
  useSyncSlackChannels,
  SlackChannel,
} from "@/hooks/useSlackChannels";

interface SlackChannelSelectorProps {
  selectedChannelIds: string[];
  onChannelsChange: (channelIds: string[], channels: SlackChannel[]) => void;
  disabled?: boolean;
}

export function SlackChannelSelector({
  selectedChannelIds,
  onChannelsChange,
  disabled = false,
}: SlackChannelSelectorProps) {
  const { data: channels = [], isLoading: isLoadingChannels } = useSlackChannels();
  const syncChannels = useSyncSlackChannels();
  const [localSelected, setLocalSelected] = useState<string[]>(selectedChannelIds);

  useEffect(() => {
    setLocalSelected(selectedChannelIds);
  }, [selectedChannelIds]);

  const handleToggleChannel = (channelId: string) => {
    const updated = localSelected.includes(channelId)
      ? localSelected.filter((id) => id !== channelId)
      : [...localSelected, channelId];
    
    setLocalSelected(updated);
    onChannelsChange(updated, channels);
  };

  const handleSync = () => {
    syncChannels.mutate();
  };

  const selectedChannels = channels.filter((c) => localSelected.includes(c.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Slack Notification Channels</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncChannels.isPending || disabled}
        >
          {syncChannels.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Sync
        </Button>
      </div>

      {/* Selected channels badges */}
      {selectedChannels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedChannels.map((channel) => (
            <Badge
              key={channel.id}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20"
              onClick={() => !disabled && handleToggleChannel(channel.id)}
            >
              <Hash className="h-3 w-3 mr-1" />
              {channel.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Channel list */}
      <div className="border rounded-lg bg-muted/30">
        {isLoadingChannels ? (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading channels...
          </div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-muted-foreground text-sm">
            <AlertCircle className="h-5 w-5 mb-2" />
            <p>No Slack channels available</p>
            <p className="text-xs">Click "Sync" to fetch channels from Slack</p>
          </div>
        ) : (
          <ScrollArea className="h-[160px]">
            <div className="p-2 space-y-1">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors ${
                    localSelected.includes(channel.id) ? "bg-accent" : ""
                  }`}
                  onClick={() => !disabled && handleToggleChannel(channel.id)}
                >
                  <Checkbox
                    checked={localSelected.includes(channel.id)}
                    onCheckedChange={() => handleToggleChannel(channel.id)}
                    disabled={disabled}
                  />
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm flex-1">{channel.name}</span>
                  {channel.member_count !== null && (
                    <span className="text-xs text-muted-foreground">
                      {channel.member_count} members
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {localSelected.length} channel{localSelected.length !== 1 ? "s" : ""} selected
      </p>
    </div>
  );
}
