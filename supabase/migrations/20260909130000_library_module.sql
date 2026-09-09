-- Migration: 20260909130000_library_module.sql
--
-- ============================================================
-- DOCUMENT LIBRARY MODULE
-- A shared reference library for documents and presentations,
-- readable by every role. Admins and managers curate it.
-- ============================================================

-- Private storage bucket holding the actual files. Reads go through
-- signed URLs generated on demand, never a public URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('library', 'library', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can view library files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'library');

CREATE POLICY "Admins and managers can upload library files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'library'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins and managers can update library files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'library'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins and managers can delete library files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'library'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);

-- Metadata table: one row per uploaded document/presentation.
CREATE TABLE public.library_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.library_documents IS 'Shared reference library of documents and presentations, visible to every role.';

CREATE TRIGGER update_library_documents_updated_at
    BEFORE UPDATE ON public.library_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track every add/edit/removal, same as every other tracked table.
CREATE TRIGGER audit_library_documents_insert
    AFTER INSERT ON public.library_documents
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_library_documents_update
    AFTER UPDATE ON public.library_documents
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_library_documents_delete
    AFTER DELETE ON public.library_documents
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE INDEX idx_library_documents_category ON public.library_documents(category);
CREATE INDEX idx_library_documents_created_at ON public.library_documents(created_at DESC);
CREATE INDEX idx_library_documents_uploaded_by ON public.library_documents(uploaded_by);

-- ============================================================
-- ROW LEVEL SECURITY
-- Every authenticated role can read; only admin and manager
-- can add, edit, or remove entries.
-- ============================================================

ALTER TABLE public.library_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view library documents" ON public.library_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can add library documents" ON public.library_documents FOR INSERT WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
    AND uploaded_by = auth.uid()
);

CREATE POLICY "Admins and managers can update library documents" ON public.library_documents FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can delete library documents" ON public.library_documents FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Deny anon access to library_documents"
ON public.library_documents AS RESTRICTIVE
FOR ALL TO anon
USING (false) WITH CHECK (false);
