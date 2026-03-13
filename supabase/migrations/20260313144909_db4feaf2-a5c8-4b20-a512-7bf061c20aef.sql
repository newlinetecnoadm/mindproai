
-- Create storage bucket for card attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-attachments', 'card-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload files
CREATE POLICY "Authenticated users upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'card-attachments');

-- RLS: Public read access (bucket is public)
CREATE POLICY "Public read card attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'card-attachments');

-- RLS: Authenticated users can delete their uploads
CREATE POLICY "Authenticated users delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'card-attachments');
