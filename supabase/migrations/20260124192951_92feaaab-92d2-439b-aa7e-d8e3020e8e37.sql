-- Fix escalate_lead_to_next_round to use fallback_admin_id from current round config
CREATE OR REPLACE FUNCTION public.escalate_lead_to_next_round(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_next_round INTEGER;
  v_next_config RECORD;
  v_current_config RECORD;
BEGIN
  -- Get the lead
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;
  
  -- Calculate next round
  v_next_round := COALESCE(v_lead.current_round, 1) + 1;
  
  -- Try to get next round config
  SELECT * INTO v_next_config
  FROM crm_round_robin_config
  WHERE language = v_lead.language
    AND round_number = v_next_round
    AND is_active = true;
  
  IF NOT FOUND THEN
    -- No more rounds - get fallback_admin_id from CURRENT round config
    SELECT fallback_admin_id, agent_ids INTO v_current_config
    FROM crm_round_robin_config
    WHERE language = v_lead.language
      AND round_number = COALESCE(v_lead.current_round, 1)
      AND is_active = true;
    
    -- Mark lead for admin fallback
    UPDATE crm_leads
    SET 
      claim_window_expires_at = NULL,
      updated_at = now()
    WHERE id = p_lead_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'admin_fallback',
      'lead_id', p_lead_id,
      'language', v_lead.language,
      'current_round', COALESCE(v_lead.current_round, 1),
      'fallback_admin_id', v_current_config.fallback_admin_id,
      'admin_agent_ids', v_current_config.agent_ids
    );
  END IF;
  
  -- Escalate to next round
  UPDATE crm_leads
  SET 
    current_round = v_next_round,
    claim_window_expires_at = now() + (v_next_config.claim_window_minutes || ' minutes')::interval,
    updated_at = now()
  WHERE id = p_lead_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', 'escalated',
    'lead_id', p_lead_id,
    'language', v_lead.language,
    'new_round', v_next_round,
    'previous_round', COALESCE(v_lead.current_round, 1),
    'claim_window_minutes', v_next_config.claim_window_minutes,
    'agent_ids', v_next_config.agent_ids,
    'fallback_admin_id', v_next_config.fallback_admin_id
  );
END;
$$;