import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  FileText,
  Globe,
  Home,
  Building2,
  HelpCircle,
  MapPin,
  Scale,
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SitemapFileInfo {
  name: string;
  path: string;
  urlCount: number;
  lastmod: string;
  type: 'index' | 'pages' | 'properties' | 'blog' | 'qa' | 'locations' | 'comparisons' | 'brochures' | 'glossary' | 'new-builds';
  language?: string;
  status: 'valid' | 'warning' | 'error' | 'unknown';
  issues?: string[];
}

interface SitemapFileTableProps {
  files: SitemapFileInfo[];
  onRegenerateFile?: (file: SitemapFileInfo) => Promise<void>;
  isLoading?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  index: FileText,
  pages: Home,
  properties: Building2,
  blog: BookOpen,
  qa: HelpCircle,
  locations: MapPin,
  comparisons: Scale,
  brochures: Globe,
  glossary: BookOpen,
  'new-builds': Building2,
};

const typeColors: Record<string, string> = {
  index: 'bg-gray-500',
  pages: 'bg-blue-500',
  properties: 'bg-green-500',
  blog: 'bg-purple-500',
  qa: 'bg-orange-500',
  locations: 'bg-cyan-500',
  comparisons: 'bg-pink-500',
  brochures: 'bg-amber-500',
  glossary: 'bg-indigo-500',
  'new-builds': 'bg-emerald-500',
};

export function SitemapFileTable({ files, onRegenerateFile, isLoading }: SitemapFileTableProps) {
  const [regeneratingFile, setRegeneratingFile] = useState<string | null>(null);
  
  const handleRegenerate = async (file: SitemapFileInfo) => {
    if (!onRegenerateFile) return;
    
    setRegeneratingFile(file.path);
    try {
      await onRegenerateFile(file);
      toast.success(`Regenerated ${file.name}`);
    } catch (error) {
      toast.error(`Failed to regenerate ${file.name}`);
    } finally {
      setRegeneratingFile(null);
    }
  };
  
  const getStatusBadge = (status: SitemapFileInfo['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Valid</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  const openInGSC = () => {
    window.open('https://search.google.com/search-console/sitemaps', '_blank');
  };
  
  // Group files by type for better organization
  const indexFiles = files.filter(f => f.type === 'index');
  const staticFiles = files.filter(f => ['pages', 'properties', 'brochures', 'glossary', 'new-builds'].includes(f.type));
  const langFiles = files.filter(f => ['blog', 'qa', 'locations', 'comparisons'].includes(f.type));
  
  const totalUrls = files.reduce((sum, f) => sum + f.urlCount, 0);
  const validCount = files.filter(f => f.status === 'valid').length;
  const warningCount = files.filter(f => f.status === 'warning').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sitemap Files
            </CardTitle>
            <CardDescription>
              {files.length} sitemaps • {totalUrls.toLocaleString()} URLs total
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 text-sm">
              <Badge variant="default" className="bg-green-500">{validCount} Valid</Badge>
              {warningCount > 0 && <Badge variant="secondary" className="bg-amber-500">{warningCount} Warnings</Badge>}
              {errorCount > 0 && <Badge variant="destructive">{errorCount} Errors</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={openInGSC}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open GSC
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Type</TableHead>
                <TableHead>Sitemap File</TableHead>
                <TableHead className="text-right w-[100px]">URLs</TableHead>
                <TableHead className="w-[120px]">Last Modified</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Master Index */}
              {indexFiles.map((file) => {
                const Icon = typeIcons[file.type] || FileText;
                return (
                  <TableRow key={file.path} className="bg-muted/30">
                    <TableCell>
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${typeColors[file.type]}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{file.path}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{file.urlCount}</TableCell>
                    <TableCell className="text-sm">{file.lastmod}</TableCell>
                    <TableCell>{getStatusBadge(file.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRegenerate(file)}
                        disabled={isLoading || regeneratingFile === file.path}
                      >
                        <RefreshCw className={`h-4 w-4 ${regeneratingFile === file.path ? 'animate-spin' : ''}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Static Sitemaps */}
              {staticFiles.map((file) => {
                const Icon = typeIcons[file.type] || FileText;
                return (
                  <TableRow key={file.path}>
                    <TableCell>
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${typeColors[file.type]}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{file.path}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{file.urlCount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{file.lastmod}</TableCell>
                    <TableCell>{getStatusBadge(file.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRegenerate(file)}
                        disabled={isLoading || regeneratingFile === file.path}
                      >
                        <RefreshCw className={`h-4 w-4 ${regeneratingFile === file.path ? 'animate-spin' : ''}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Language-specific Sitemaps */}
              {langFiles.map((file) => {
                const Icon = typeIcons[file.type] || FileText;
                return (
                  <TableRow key={file.path}>
                    <TableCell>
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${typeColors[file.type]}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {file.name}
                        {file.language && (
                          <Badge variant="outline" className="text-xs">{file.language.toUpperCase()}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{file.path}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{file.urlCount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{file.lastmod}</TableCell>
                    <TableCell>{getStatusBadge(file.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRegenerate(file)}
                        disabled={isLoading || regeneratingFile === file.path}
                      >
                        <RefreshCw className={`h-4 w-4 ${regeneratingFile === file.path ? 'animate-spin' : ''}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {files.some(f => f.issues && f.issues.length > 0) && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Issues Detected
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {files.filter(f => f.issues && f.issues.length > 0).map(f => 
                f.issues!.map((issue, idx) => (
                  <li key={`${f.path}-${idx}`}>• {f.name}: {issue}</li>
                ))
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
