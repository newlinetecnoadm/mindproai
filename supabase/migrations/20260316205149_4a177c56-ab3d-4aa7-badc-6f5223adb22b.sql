-- Enable realtime for invitations and board_members so UI updates immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;