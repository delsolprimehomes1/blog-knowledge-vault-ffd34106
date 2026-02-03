import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallRecordingPlayerProps {
  url: string;
  compact?: boolean;
  className?: string;
}

export function CallRecordingPlayer({ url, compact = false, className }: CallRecordingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setIsLoaded(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    window.open(url, "_blank");
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <audio ref={audioRef} src={url} preload="metadata" />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={togglePlayPause}
          disabled={!isLoaded}
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        {isLoaded && (
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 p-2 bg-muted/50 rounded-md", className)}>
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={togglePlayPause}
        disabled={!isLoaded}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <Volume2 className="h-3 w-3 text-muted-foreground" />
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          disabled={!isLoaded}
        />
        <span className="text-xs text-muted-foreground min-w-[4rem] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={handleDownload}
        title="Download recording"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
