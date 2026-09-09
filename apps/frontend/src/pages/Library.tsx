import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, ErrorState, EmptyState } from '@/components/common/QueryState';
import {
  Search,
  Plus,
  BookOpen,
  FolderOpen,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  Presentation,
  File as FileIcon,
  HardDrive,
} from 'lucide-react';
import { LibraryUploadDialog } from '@/components/forms/LibraryUploadDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import {
  useLibraryDocuments,
  useUploadLibraryDocument,
  useDeleteLibraryDocument,
  getLibraryDownloadUrl,
  LibraryDocument,
  LIBRARY_CATEGORIES,
} from '@/hooks/api/useLibrary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function getFileKind(mimeType: string, fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/')) {
    return { icon: FileImage, className: 'bg-purple-100 text-purple-700' };
  }
  if (mimeType.includes('pdf') || ext === 'pdf') {
    return { icon: FileText, className: 'bg-red-100 text-red-700' };
  }
  if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(ext)) {
    return { icon: Presentation, className: 'bg-orange-100 text-orange-700' };
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return { icon: FileSpreadsheet, className: 'bg-emerald-100 text-emerald-700' };
  }
  if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) {
    return { icon: FileText, className: 'bg-blue-100 text-blue-700' };
  }
  return { icon: FileIcon, className: 'bg-muted text-muted-foreground' };
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date: string) => new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

export function Library() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<LibraryDocument | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { isAdmin, isManager } = usePermissions();
  const canManageLibrary = isAdmin || isManager;

  const { data: documents = [], isLoading, error: docsError, refetch: refetchDocs } = useLibraryDocuments();
  const uploadDocument = useUploadLibraryDocument();
  const deleteDocument = useDeleteLibraryDocument();

  const trimmedSearch = searchQuery.trim().toLowerCase();
  const filteredDocuments = useMemo(() => documents.filter((doc) => {
    const matchesSearch = !trimmedSearch ||
      doc.title.toLowerCase().includes(trimmedSearch) ||
      (doc.description || '').toLowerCase().includes(trimmedSearch);
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [categoryFilter, documents, trimmedSearch]);

  const totalSize = documents.reduce((acc, doc) => acc + Number(doc.file_size || 0), 0);
  const categoryCount = new Set(documents.map((doc) => doc.category)).size;

  const handleUpload = (data: any) => {
    if (!canManageLibrary) {
      toast.error('You do not have permission to add documents to the library');
      return;
    }
    uploadDocument.mutate(data);
  };

  const handleDownload = async (doc: LibraryDocument) => {
    setDownloadingId(doc.id);
    try {
      const url = await getLibraryDownloadUrl(doc.file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open this document right now.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = () => {
    if (!deletingDoc) return;
    deleteDocument.mutate(
      { id: deletingDoc.id, file_path: deletingDoc.file_path },
      { onSuccess: () => setDeletingDoc(null) }
    );
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (docsError) {
    return <ErrorState message="Failed to load the library." onRetry={() => refetchDocs()} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Library</h1>
          <p className="text-sm text-muted-foreground">
            Documents and presentations kept here for future reference
          </p>
        </div>
        {canManageLibrary && (
          <Button variant="wheat" size="sm" onClick={() => setIsUploadOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Document
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4" variant="forest">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading">{documents.length}</p>
              <p className="text-xs sm:text-sm opacity-80">Documents</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-accent-foreground">{categoryCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Categories</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 col-span-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold font-heading text-secondary">{formatFileSize(totalSize)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total storage used</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {LIBRARY_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="p-4">
            <EmptyState
              title="No documents found"
              description={documents.length === 0 ? 'Nothing has been added to the library yet.' : 'Try adjusting your search or filters.'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredDocuments.map((doc, index) => {
            const { icon: Icon, className } = getFileKind(doc.mime_type, doc.file_name);
            return (
              <Card key={doc.id} variant="elevated" className="animate-fade-in" style={{ animationDelay: `${index * 0.04}s` }}>
                <CardContent className="p-4 flex flex-col gap-3 h-full">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${className}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate" title={doc.title}>{doc.title}</p>
                      <Badge variant="sage" className="mt-1 text-[10px]">{doc.category}</Badge>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{doc.description}</p>
                  )}

                  <div className="mt-auto space-y-1 text-[11px] text-muted-foreground">
                    <p>{formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}</p>
                    {doc.uploaded_by_name && <p>Added by {doc.uploaded_by_name}</p>}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Open
                    </Button>
                    {canManageLibrary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeletingDoc(doc)}
                        aria-label={`Delete ${doc.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {canManageLibrary && (
        <>
          <LibraryUploadDialog
            open={isUploadOpen}
            onOpenChange={setIsUploadOpen}
            onSubmit={handleUpload}
            isSubmitting={uploadDocument.isPending}
          />

          <AlertDialog open={!!deletingDoc} onOpenChange={(o) => { if (!o) setDeletingDoc(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this document?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{deletingDoc ? ` "${deletingDoc.title}"` : ' this document'} from the library. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteDocument.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
