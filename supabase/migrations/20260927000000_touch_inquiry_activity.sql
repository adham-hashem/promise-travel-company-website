-- Keep the most recently active inquiry at the top of sales lists.
CREATE OR REPLACE FUNCTION public.touch_related_inquiry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_inquiry_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_inquiry_id := OLD.inquiry_id;
  ELSE
    target_inquiry_id := NEW.inquiry_id;
  END IF;
  UPDATE public.inquiries SET updated_at = now() WHERE id = target_inquiry_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_inquiry_on_interest ON public.inquiry_interests;
CREATE TRIGGER trg_touch_inquiry_on_interest
AFTER INSERT OR UPDATE OR DELETE ON public.inquiry_interests
FOR EACH ROW EXECUTE FUNCTION public.touch_related_inquiry();

DROP TRIGGER IF EXISTS trg_touch_inquiry_on_follow_up ON public.inquiry_follow_ups;
CREATE TRIGGER trg_touch_inquiry_on_follow_up
AFTER INSERT OR UPDATE OR DELETE ON public.inquiry_follow_ups
FOR EACH ROW EXECUTE FUNCTION public.touch_related_inquiry();
