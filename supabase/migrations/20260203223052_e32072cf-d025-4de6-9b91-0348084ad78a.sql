-- Create increment_agent_lead_count function to match the existing decrement function
CREATE OR REPLACE FUNCTION increment_agent_lead_count(p_agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE crm_agents
  SET current_lead_count = COALESCE(current_lead_count, 0) + 1
  WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;