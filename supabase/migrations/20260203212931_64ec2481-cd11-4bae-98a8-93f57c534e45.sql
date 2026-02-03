CREATE OR REPLACE FUNCTION public.match_lead_by_phone(
  search_digits text,
  agent_uuid uuid
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  phone_number text,
  full_phone text,
  assigned_agent_id uuid,
  first_contact_at timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, 
    l.first_name, 
    l.last_name, 
    l.phone_number, 
    l.full_phone, 
    l.assigned_agent_id,
    l.first_contact_at,
    l.created_at
  FROM crm_leads l
  WHERE l.assigned_agent_id = agent_uuid
    AND (
      regexp_replace(l.phone_number, '[^0-9]', '', 'g') LIKE '%' || search_digits || '%'
      OR regexp_replace(COALESCE(l.full_phone, ''), '[^0-9]', '', 'g') LIKE '%' || search_digits || '%'
    )
  ORDER BY l.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public';