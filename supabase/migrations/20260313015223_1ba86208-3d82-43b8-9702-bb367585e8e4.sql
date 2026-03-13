INSERT INTO storage.buckets (id, name, public) VALUES ('diagram-thumbnails', 'diagram-thumbnails', true);

CREATE POLICY "Anyone can view thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'diagram-thumbnails');

CREATE POLICY "Authenticated users upload thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'diagram-thumbnails');

CREATE POLICY "Users update own thumbnails" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'diagram-thumbnails');

CREATE POLICY "Users delete own thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'diagram-thumbnails');