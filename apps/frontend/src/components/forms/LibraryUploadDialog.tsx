// src/components/forms/LibraryUploadDialog.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LIBRARY_CATEGORIES, MAX_LIBRARY_FILE_BYTES, UploadLibraryDocumentDto } from '@/hooks/api/useLibrary';
import { FileUp, Paperclip, X } from 'lucide-react';

interface LibraryUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UploadLibraryDocumentDto) => void;
  isSubmitting?: boolean;
}

const emptyForm = {
  title: '',
  description: '',
  category: LIBRARY_CATEGORIES[0],
};

export function LibraryUploadDialog({ open, onOpenChange, onSubmit, isSubmitting }: LibraryUploadDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFormData(emptyForm);
      setFile(null);
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;

    if (selected.size > MAX_LIBRARY_FILE_BYTES) {
      toast({
        title: 'File too large',
        description: `Files must be under ${MAX_LIBRARY_FILE_BYTES / (1024 * 1024)}MB.`,
        variant: 'destructive',
      });
      return;
    }

    setFile(selected);
    if (!formData.title.trim()) {
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
      setFormData((prev) => ({ ...prev, title: nameWithoutExt }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({ title: 'Validation Error', description: 'Please choose a file to upload', variant: 'destructive' });
      return;
    }
    if (!formData.title.trim()) {
      toast({ title: 'Validation Error', description: 'Please give this document a title', variant: 'destructive' });
      return;
    }

    onSubmit({
      file,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add to Library</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-1">
          <div className="space-y-2">
            <Label>File *</Label>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,image/*"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-sm">
                <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="flex-shrink-0 text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)}MB</span>
                <button type="button" onClick={() => setFile(null)} className="flex-shrink-0 text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <FileUp className="h-6 w-6" />
                Click to choose a document or presentation
                <span className="text-xs">PDF, Word, PowerPoint, Excel, images — up to {MAX_LIBRARY_FILE_BYTES / (1024 * 1024)}MB</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Field Visit SOP 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {LIBRARY_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="What is this document for, and when should someone use it?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="wheat" className="flex-1" disabled={isSubmitting}>
              Add Document
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
