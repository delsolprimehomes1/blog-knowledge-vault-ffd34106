import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, Circle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

interface CreateClusterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClusterCreated: () => void;
}

interface GenerationProgress {
  current_step: number;
  total_steps: number;
  current_article: number;
  total_articles: number;
  step_description?: string;
}

export function CreateClusterDialog({ open, onOpenChange, onClusterCreated }: CreateClusterDialogProps) {
  const [topic, setTopic] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const resetForm = () => {
    setTopic("");
    setPrimaryKeyword("");
    setTargetAudience("");
    setIsGenerating(false);
    setProgress(null);
    setJobId(null);
  };

  const handleClose = () => {
    if (isGenerating) {
      // Don't allow closing during generation
      return;
    }
    resetForm();
    onOpenChange(false);
  };

  const pollJobStatus = async (id: string) => {
    const maxAttempts = 300; // 25 minutes max (5s intervals)
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Count actual articles created for this cluster (more reliable than job.progress)
      const { count: articlesCreated } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('cluster_id', id)
        .eq('language', 'en');
      
      const articleCount = articlesCreated || 0;
      
      // Update progress based on actual article count
      setProgress({
        current_step: articleCount,
        total_steps: 6,
        current_article: articleCount,
        total_articles: 6
      });
      
      // Check job status for completion/failure
      const { data: job, error } = await supabase
        .from('cluster_generations')
        .select('status, error')
        .eq('id', id)
        .maybeSingle();
      
      if (error || !job) continue;
      
      // Success: 6 English articles created OR job marked completed
      if (articleCount >= 6 || job.status === 'completed') {
        toast.success(`Cluster created with ${articleCount} articles!`);
        setIsGenerating(false);
        resetForm();
        onClusterCreated();
        onOpenChange(false);
        return;
      }
      
      if (job.status === 'failed') {
        toast.error(`Generation failed: ${job.error || 'Unknown error'}`);
        setIsGenerating(false);
        return;
      }
    }
    
    toast.error("Generation timed out. Check the cluster list for status.");
    setIsGenerating(false);
  };

  const createClusterMutation = useMutation({
    mutationFn: async () => {
      // Call edge function directly - it creates the cluster_generations record
      const { data, error } = await supabase.functions.invoke('generate-cluster', {
        body: { 
          topic,
          primaryKeyword,
          targetAudience,
          language: 'en'
        }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to start generation');
      
      setJobId(data.jobId);
      return data.jobId;
    },
    onSuccess: (id) => {
      toast.info("Cluster generation started. This may take a few minutes...");
      pollJobStatus(id);
    },
    onError: (error) => {
      toast.error(`Failed to start generation: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const handleSubmit = () => {
    if (!topic.trim() || !primaryKeyword.trim() || !targetAudience.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsGenerating(true);
    setProgress({ current_step: 0, total_steps: 11, current_article: 0, total_articles: 6 });
    createClusterMutation.mutate();
  };

  const progressPercent = progress 
    ? Math.round((progress.current_article / progress.total_articles) * 100)
    : 0;

  const getStepIcon = (stepNum: number, currentStep: number) => {
    if (stepNum < currentStep) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (stepNum === currentStep) return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isGenerating ? "Creating Cluster..." : "Create New Blog Cluster"}
          </DialogTitle>
          <DialogDescription>
            {isGenerating 
              ? "Generating 6 English articles with AI. This may take 3-5 minutes."
              : "Enter the topic details to generate a new cluster of 6 English articles."
            }
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div key={num} className="flex items-center gap-3 text-sm">
                  {getStepIcon(num, (progress?.current_article || 0) + 1)}
                  <span className={num <= (progress?.current_article || 0) ? "text-foreground" : "text-muted-foreground"}>
                    {num <= (progress?.current_article || 0) 
                      ? `Article ${num} generated` 
                      : num === (progress?.current_article || 0) + 1
                        ? `Generating article ${num}...`
                        : `Article ${num}`
                    }
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Please don't close this dialog. Generation will continue in background if you navigate away.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., Costa del Sol Investment Properties"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyword">Primary Keyword *</Label>
              <Input
                id="keyword"
                placeholder="e.g., buy property costa del sol"
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience *</Label>
              <Textarea
                id="audience"
                placeholder="e.g., European retirees seeking Spanish property investment"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">This will generate:</p>
                <ul className="space-y-0.5">
                  <li>• 6 English articles (3 TOFU, 2 MOFU, 1 BOFU)</li>
                  <li>• Featured images via AI</li>
                  <li>• E-E-A-T compliant content</li>
                  <li>• JSON-LD schema markup</li>
                </ul>
                <p className="mt-2">Use "Complete Cluster" to translate to 9 additional languages.</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {isGenerating ? (
            <Button variant="outline" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!topic.trim() || !primaryKeyword.trim() || !targetAudience.trim()}>
                Create Cluster
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
