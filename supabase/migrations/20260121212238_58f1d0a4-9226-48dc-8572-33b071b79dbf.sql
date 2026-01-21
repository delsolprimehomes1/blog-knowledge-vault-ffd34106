-- Seed International Routing Rules for Hans
-- Dynamically lookup agent ID and insert 4 Tier 1 rules

DO $$
DECLARE
  hans_id UUID;
BEGIN
  -- Get Hans's agent ID dynamically
  SELECT id INTO hans_id FROM crm_agents WHERE email = 'hans@delsolprimehomes.com' LIMIT 1;
  
  -- Skip if Hans not found
  IF hans_id IS NULL THEN
    RAISE NOTICE 'Hans agent not found (hans@delsolprimehomes.com), skipping rule creation';
    RETURN;
  END IF;

  -- 1. French Allocation (Instant to Hans) - Priority 10
  INSERT INTO crm_routing_rules (
    rule_name, 
    rule_description, 
    priority, 
    is_active,
    match_language, 
    assign_to_agent_id, 
    fallback_to_broadcast
  ) VALUES (
    'French Allocation',
    'Auto-assign all French-speaking leads to Hans (Tier 1 instant)',
    10, 
    true,
    ARRAY['fr'], 
    hans_id, 
    false
  ) ON CONFLICT DO NOTHING;

  -- 2. Dutch Allocation (Instant to Hans) - Priority 10
  INSERT INTO crm_routing_rules (
    rule_name, 
    rule_description, 
    priority, 
    is_active,
    match_language, 
    assign_to_agent_id, 
    fallback_to_broadcast
  ) VALUES (
    'Dutch Allocation',
    'Auto-assign all Dutch-speaking leads to Hans (Tier 1 instant)',
    10, 
    true,
    ARRAY['nl'], 
    hans_id, 
    false
  ) ON CONFLICT DO NOTHING;

  -- 3. German Allocation (Instant to Hans) - Priority 10
  INSERT INTO crm_routing_rules (
    rule_name, 
    rule_description, 
    priority, 
    is_active,
    match_language, 
    assign_to_agent_id, 
    fallback_to_broadcast
  ) VALUES (
    'German Allocation',
    'Auto-assign all German-speaking leads to Hans (Tier 1 instant)',
    10, 
    true,
    ARRAY['de'], 
    hans_id, 
    false
  ) ON CONFLICT DO NOTHING;

  -- 4. English Round Robin (Broadcast fallback) - Priority 5
  INSERT INTO crm_routing_rules (
    rule_name, 
    rule_description, 
    priority, 
    is_active,
    match_language, 
    assign_to_agent_id, 
    fallback_to_broadcast
  ) VALUES (
    'English Round Robin',
    'English leads go to broadcast/round robin system (Tier 2)',
    5, 
    true,
    ARRAY['en'], 
    hans_id, 
    true  -- Fallback enabled for round robin
  ) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created 4 international routing rules for Hans (ID: %)', hans_id;
END $$;