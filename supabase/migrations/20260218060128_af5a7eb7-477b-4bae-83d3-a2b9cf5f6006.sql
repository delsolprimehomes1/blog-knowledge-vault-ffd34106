
CREATE OR REPLACE FUNCTION public.is_agent_available_now(p_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_timezone TEXT;
  v_start_hour INTEGER;
  v_end_hour INTEGER;
  v_current_hour INTEGER;
  v_current_time_in_tz TIMESTAMPTZ;
BEGIN
  -- Get agent's timezone and working hours
  SELECT timezone, working_hours_start, working_hours_end
  INTO v_timezone, v_start_hour, v_end_hour
  FROM crm_agents
  WHERE id = p_agent_id;

  IF v_timezone IS NULL THEN
    -- Default to Europe/Madrid if no timezone set
    v_timezone := 'Europe/Madrid';
  END IF;

  -- Default working hours if not set
  v_start_hour := COALESCE(v_start_hour, 8);
  v_end_hour   := COALESCE(v_end_hour, 20);

  -- Convert current time to agent's timezone and extract hour
  v_current_time_in_tz := NOW() AT TIME ZONE v_timezone;
  v_current_hour := EXTRACT(HOUR FROM v_current_time_in_tz)::INTEGER;

  -- Check if within working hours
  RETURN v_current_hour >= v_start_hour AND v_current_hour < v_end_hour;
END;
$$;
