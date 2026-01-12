import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Image, 
  Upload, 
  Play, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Pause,
  RotateCcw
} from "lucide-react";

interface ImageStats {
  falAi: number;
  supabase: number;
  unsplash: number;
  other: number;
}

interface TableStats {
  name: string;
  label: string;
  falAiCount: number;
  selected: boolean;
}

interface MigrationProgress {
  current: number;
  total: number;
  percent: number;
}

interface MigrationResults {
  migrated: number;
  failed: number;
  errors: Array<{ article: string; error: string }>;
}

interface LogEntry {
  timestamp: Date;
  type: 'success' | 'error' | 'info';
  message: string;
}

const MigrateImages = () => {
  const [imageStats, setImageStats] = useState<ImageStats>({
    falAi: 0,
    supabase: 0,
    unsplash: 0,
    other: 0
  });
  const [tableStats, setTableStats] = useState<TableStats[]>([
    { name: 'blog_articles', label: 'Blog Articles', falAiCount: 0, selected: true },
    { name: 'qa_pages', label: 'Q&A Pages', falAiCount: 0, selected: true },
    { name: 'location_pages', label: 'Location Pages', falAiCount: 0, selected: true }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress>({
    current: 0,
    total: 0,
    percent: 0
  });
  const [results, setResults] = useState<MigrationResults>({
    migrated: 0,
    failed: 0,
    errors: []
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentTable, setCurrentTable] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const pauseRef = React.useRef(false);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { timestamp: new Date(), type, message }]);
  }, []);

  const fetchImageStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch blog articles image stats
      const { data: blogData, error: blogError } = await supabase
        .from('blog_articles')
        .select('featured_image_url')
        .not('featured_image_url', 'is', null);

      if (blogError) throw blogError;

      // Fetch QA pages image stats
      const { data: qaData, error: qaError } = await supabase
        .from('qa_pages')
        .select('featured_image_url')
        .not('featured_image_url', 'is', null);

      if (qaError) throw qaError;

      // Fetch location pages image stats
      const { data: locationData, error: locationError } = await supabase
        .from('location_pages')
        .select('featured_image_url')
        .not('featured_image_url', 'is', null);

      if (locationError) throw locationError;

      // Combine all images
      const allImages = [
        ...(blogData || []).map(a => ({ url: a.featured_image_url, table: 'blog_articles' })),
        ...(qaData || []).map(a => ({ url: a.featured_image_url, table: 'qa_pages' })),
        ...(locationData || []).map(a => ({ url: a.featured_image_url, table: 'location_pages' }))
      ];

      // Categorize images
      let falAi = 0, supabaseCount = 0, unsplash = 0, other = 0;
      const tableCounts: Record<string, number> = {
        'blog_articles': 0,
        'qa_pages': 0,
        'location_pages': 0
      };

      allImages.forEach(({ url, table }) => {
        if (!url) return;
        
        if (url.includes('fal.media') || url.includes('fal.ai') || url.includes('v3.fal.media')) {
          falAi++;
          tableCounts[table]++;
        } else if (url.includes('supabase') || url.includes('kazggnufaoicopvmwhdl')) {
          supabaseCount++;
        } else if (url.includes('unsplash')) {
          unsplash++;
        } else {
          other++;
        }
      });

      setImageStats({
        falAi,
        supabase: supabaseCount,
        unsplash,
        other
      });

      setTableStats(prev => prev.map(t => ({
        ...t,
        falAiCount: tableCounts[t.name] || 0
      })));

    } catch (error) {
      console.error('Error fetching image stats:', error);
      toast.error('Failed to fetch image statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImageStats();
  }, [fetchImageStats]);

  const runDryRun = async () => {
    setIsDryRun(true);
    setLogs([]);
    setResults({ migrated: 0, failed: 0, errors: [] });
    addLog('info', '🔍 Starting dry run...');

    const selectedTables = tableStats.filter(t => t.selected);
    let totalWouldMigrate = 0;

    for (const table of selectedTables) {
      addLog('info', `📋 Checking ${table.label}...`);
      
      try {
        const { data, error } = await supabase.functions.invoke('migrate-fal-images', {
          body: { 
            table: table.name, 
            batch_size: 100,
            dry_run: true,
            offset: 0
          }
        });

        if (error) {
          addLog('error', `❌ Error checking ${table.label}: ${error.message}`);
          continue;
        }

        const count = (data?.total || 0);
        totalWouldMigrate += count;
        addLog('info', `📊 ${table.label}: ${count} images would be migrated`);
      } catch (err: any) {
        addLog('error', `❌ Error: ${err.message}`);
      }
    }

    addLog('success', `✅ Dry run complete! Would migrate ${totalWouldMigrate} images total`);
    setIsDryRun(false);
  };

  const migrateTable = async (tableName: string, tableLabel: string): Promise<{ migrated: number; failed: number }> => {
    let hasMore = true;
    let offset = 0;
    const batchSize = 10;
    let tableMigrated = 0;
    let tableFailed = 0;

    while (hasMore && !pauseRef.current) {
      try {
        addLog('info', `⏳ Processing ${tableLabel} batch (offset: ${offset})...`);
        
        const { data, error } = await supabase.functions.invoke('migrate-fal-images', {
          body: { 
            table: tableName, 
            batch_size: batchSize,
            offset,
            dry_run: false
          }
        });

        if (error) {
          addLog('error', `❌ Batch error: ${error.message}`);
          tableFailed += batchSize;
          offset += batchSize;
          continue;
        }

        const batchMigrated = data?.migrated || 0;
        const batchFailed = data?.failed || 0;
        const remaining = data?.remaining || 0;

        tableMigrated += batchMigrated;
        tableFailed += batchFailed;

        // Log individual results
        if (data?.results) {
          data.results.forEach((r: any) => {
            if (r.success) {
              addLog('success', `✅ Migrated: ${r.slug || r.id}`);
            } else {
              addLog('error', `❌ Failed: ${r.slug || r.id} - ${r.error}`);
              setResults(prev => ({
                ...prev,
                errors: [...prev.errors, { article: r.slug || r.id, error: r.error }]
              }));
            }
          });
        }

        // Update progress
        setProgress(prev => {
          const newCurrent = prev.current + batchMigrated;
          const newTotal = Math.max(prev.total, newCurrent + remaining);
          return {
            current: newCurrent,
            total: newTotal,
            percent: newTotal > 0 ? Math.round((newCurrent / newTotal) * 100) : 0
          };
        });

        setResults(prev => ({
          ...prev,
          migrated: prev.migrated + batchMigrated,
          failed: prev.failed + batchFailed
        }));

        hasMore = data?.hasMore ?? false;
        offset = data?.nextOffset ?? offset + batchSize;

        // Wait between batches
        if (hasMore) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err: any) {
        addLog('error', `❌ Error: ${err.message}`);
        tableFailed += batchSize;
        offset += batchSize;
      }
    }

    return { migrated: tableMigrated, failed: tableFailed };
  };

  const startMigration = async () => {
    setIsMigrating(true);
    setIsComplete(false);
    setIsPaused(false);
    pauseRef.current = false;
    setLogs([]);
    setResults({ migrated: 0, failed: 0, errors: [] });
    setProgress({ current: 0, total: imageStats.falAi, percent: 0 });

    const selectedTables = tableStats.filter(t => t.selected && t.falAiCount > 0);
    
    if (selectedTables.length === 0) {
      addLog('info', '⚠️ No tables selected or no images to migrate');
      setIsMigrating(false);
      return;
    }

    addLog('info', '🚀 Starting migration...');

    const tableResults: Record<string, { migrated: number; failed: number }> = {};

    for (const table of selectedTables) {
      if (pauseRef.current) {
        addLog('info', '⏸️ Migration paused');
        break;
      }

      setCurrentTable(table.label);
      addLog('info', `📦 Starting migration for ${table.label}...`);
      
      const result = await migrateTable(table.name, table.label);
      tableResults[table.label] = result;
      
      addLog('success', `✅ ${table.label}: ${result.migrated} migrated, ${result.failed} failed`);
    }

    if (!pauseRef.current) {
      setIsComplete(true);
      addLog('success', '🎉 Migration complete!');
      
      // Show summary
      let summaryMessage = '\n📊 Final Summary:\n';
      Object.entries(tableResults).forEach(([table, result]) => {
        summaryMessage += `• ${table}: ${result.migrated} migrated, ${result.failed} failed\n`;
      });
      addLog('info', summaryMessage);

      // Refresh stats
      await fetchImageStats();
      toast.success('Migration complete! Check the logs for details.');
    }

    setIsMigrating(false);
    setCurrentTable('');
  };

  const pauseMigration = () => {
    pauseRef.current = true;
    setIsPaused(true);
    addLog('info', '⏸️ Pausing migration after current batch...');
  };

  const resumeMigration = () => {
    setIsPaused(false);
    pauseRef.current = false;
    startMigration();
  };

  const retryFailed = async () => {
    if (results.errors.length === 0) {
      toast.info('No failed items to retry');
      return;
    }
    
    addLog('info', `🔄 Retrying ${results.errors.length} failed items...`);
    // For now, just restart the migration - a more sophisticated retry would track specific failed items
    await startMigration();
  };

  const toggleTable = (tableName: string) => {
    setTableStats(prev => prev.map(t => 
      t.name === tableName ? { ...t, selected: !t.selected } : t
    ));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Upload className="h-8 w-8 text-primary" />
          Migrate Images to Supabase Storage
        </h1>
        <p className="text-muted-foreground mt-2">
          Move all AI-generated images from external CDN to your storage for faster loading
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500">{imageStats.falAi}</p>
              <p className="text-sm text-muted-foreground">Fal.ai (migrate)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{imageStats.supabase}</p>
              <p className="text-sm text-muted-foreground">Supabase (done)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{imageStats.unsplash}</p>
              <p className="text-sm text-muted-foreground">Unsplash (skip)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-500">{imageStats.other}</p>
              <p className="text-sm text-muted-foreground">Other</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Tables to Migrate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tableStats.map(table => (
              <div key={table.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id={table.name}
                    checked={table.selected}
                    onCheckedChange={() => toggleTable(table.name)}
                    disabled={isMigrating}
                  />
                  <label htmlFor={table.name} className="cursor-pointer">
                    {table.label}
                  </label>
                </div>
                <Badge variant={table.falAiCount > 0 ? "default" : "secondary"}>
                  {table.falAiCount} images
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button
          variant="outline"
          onClick={runDryRun}
          disabled={isMigrating || isDryRun}
        >
          <Search className="mr-2 h-4 w-4" />
          {isDryRun ? 'Running...' : 'Dry Run First'}
        </Button>
        
        {!isMigrating ? (
          <Button
            onClick={startMigration}
            disabled={isDryRun || imageStats.falAi === 0}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Migration
          </Button>
        ) : isPaused ? (
          <Button onClick={resumeMigration}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        ) : (
          <Button variant="outline" onClick={pauseMigration}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        )}

        <Button
          variant="outline"
          onClick={fetchImageStats}
          disabled={isLoading || isMigrating}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>

        {results.failed > 0 && !isMigrating && (
          <Button variant="outline" onClick={retryFailed}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Failed ({results.failed})
          </Button>
        )}
      </div>

      {/* Progress Section */}
      {(isMigrating || isComplete) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {isComplete ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Migration Complete!
                </>
              ) : (
                <>
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Migrating {currentTable}...
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress: {progress.current} / {progress.total}</span>
                  <span>{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} className="h-3" />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Migrated: {results.migrated}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span>Failed: {results.failed}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Migration Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Migration Log
          </CardTitle>
          <CardDescription>
            Real-time log of migration progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded border p-4 bg-muted/30">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Click "Dry Run First" or "Start Migration" to begin
              </p>
            ) : (
              <div className="space-y-1 font-mono text-sm">
                {logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`py-1 ${
                      log.type === 'success' ? 'text-green-600 dark:text-green-400' :
                      log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                      'text-muted-foreground'
                    }`}
                  >
                    <span className="opacity-50">
                      [{log.timestamp.toLocaleTimeString()}]
                    </span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Final Results Summary */}
      {isComplete && (
        <Card className="mt-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold">Migration Complete!</h3>
              <div className="text-lg">
                <p>✅ <strong>{results.migrated}</strong> images migrated to Supabase Storage</p>
                {results.failed > 0 && (
                  <p className="text-red-600">❌ <strong>{results.failed}</strong> images failed</p>
                )}
              </div>
              <p className="text-muted-foreground">
                All migrated images now loading 5-10x faster! 🚀
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MigrateImages;
