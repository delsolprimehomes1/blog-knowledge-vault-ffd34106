import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ExternalLink, ArrowRight } from "lucide-react";
import type { MissingCanonical } from "@/hooks/useCanonicalBackfill";

interface MissingCanonicalTableProps {
  items: MissingCanonical[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function MissingCanonicalTable({
  items,
  isLoading,
  selectedIds,
  onSelectionChange,
}: MissingCanonicalTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");

  const languages = [...new Set(items.map(i => i.language))];
  const types = [...new Set(items.map(i => i.type))];

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.headline.toLowerCase().includes(search.toLowerCase()) ||
      item.slug.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesLanguage = languageFilter === "all" || item.language === languageFilter;

    return matchesSearch && matchesType && matchesLanguage;
  });

  const allSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));
  const someSelected = filteredItems.some(i => selectedIds.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      const newSet = new Set(selectedIds);
      filteredItems.forEach(i => newSet.delete(i.id));
      onSelectionChange(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filteredItems.forEach(i => newSet.add(i.id));
      onSelectionChange(newSet);
    }
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'blog': return 'default';
      case 'qa': return 'secondary';
      case 'comparison': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Scanning for missing canonical URLs...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by headline or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map(type => (
              <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {languages.map(lang => (
              <SelectItem key={lang} value={lang}>{lang.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count and selection */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredItems.length} of {items.length} items • {selectedIds.size} selected
        </p>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[80px]">Type</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="w-[80px]">Lang</TableHead>
              <TableHead>Current → Expected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {items.length === 0 ? "All canonical URLs are properly set!" : "No matches for current filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                      aria-label={`Select ${item.headline}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(item.type)}>
                      {item.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm line-clamp-1">{item.headline}</p>
                      <p className="text-xs text-muted-foreground">/{item.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.language.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        {item.currentCanonical || '(empty)'}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="text-green-600 truncate max-w-[200px]">
                        {item.expectedCanonical}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
