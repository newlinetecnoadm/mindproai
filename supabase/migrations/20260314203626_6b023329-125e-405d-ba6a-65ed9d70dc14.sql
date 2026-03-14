
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'free';
  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.user_id, free_plan_id, 'active');
  RETURN NEW;
END;
$function$;
