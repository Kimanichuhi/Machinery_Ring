// src/hooks/api/useLibrary.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { STALE_TIME } from '@/lib/queryConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const LIBRARY_BUCKET = 'library';
export const MAX_LIBRARY_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export const LIBRARY_CATEGORIES = [
  'Policy & SOPs',
  'Training Materials',
  'Presentations',
  'Forms & Templates',
  'Reports',
  'Reference Guides',
  'Other',
];

export interface LibraryDocument {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  uploaded_by_name?: string;
}

export interface LibraryFilters {
  category?: string;
  search?: string;
}

export const libraryKeys = {
  all: ['library-documents'] as const,
  lists: () => [...libraryKeys.all, 'list'] as const,
  list: (filters: LibraryFilters = {}) => [...libraryKeys.lists(), filters] as const,
};

export function useLibraryDocuments(filters: LibraryFilters = {}) {
  return useQuery({
    queryKey: libraryKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('library_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching library documents:', error);
        throw error;
      }

      const uploaderIds = [...new Set((data || []).map((doc) => doc.uploaded_by).filter(Boolean))];
      const uploadersRes = uploaderIds.length > 0
        ? await supabase.from('profiles').select('id, name').in('id', uploaderIds)
        : { data: [] };
      const uploadersMap = (uploadersRes.data || []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {} as Record<string, string>);

      return (data || []).map((doc) => ({
        ...doc,
        uploaded_by_name: uploadersMap[doc.uploaded_by] || '',
      })) as LibraryDocument[];
    },
    staleTime: STALE_TIME.STANDARD,
  });
}

export interface UploadLibraryDocumentDto {
  file: File;
  title: string;
  description?: string;
  category: string;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

export function useUploadLibraryDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, title, description, category }: UploadLibraryDocumentDto) => {
      if (file.size > MAX_LIBRARY_FILE_BYTES) {
        throw new Error(`"${file.name}" is too large. Files must be under ${MAX_LIBRARY_FILE_BYTES / (1024 * 1024)}MB.`);
      }

      const path = `${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from(LIBRARY_BUCKET).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('library_documents')
        .insert({
          title,
          description: description || null,
          category,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
        })
        .select()
        .single();

      if (error) {
        // Roll back the uploaded object so it doesn't orphan in storage.
        await supabase.storage.from(LIBRARY_BUCKET).remove([path]);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
      toast.success('Document added to the library');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload document');
    },
  });
}

export function useDeleteLibraryDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (doc: Pick<LibraryDocument, 'id' | 'file_path'>) => {
      const { error } = await supabase.from('library_documents').delete().eq('id', doc.id);
      if (error) throw error;

      const { error: storageError } = await supabase.storage.from(LIBRARY_BUCKET).remove([doc.file_path]);
      if (storageError) {
        console.error('Library document row deleted but file removal failed:', storageError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
      toast.success('Document removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove document');
    },
  });
}

export async function getLibraryDownloadUrl(filePath: string) {
  const { data, error } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUrl(filePath, 60);
  if (error || !data?.signedUrl) {
    throw error || new Error('Could not generate a download link.');
  }
  return data.signedUrl;
}
