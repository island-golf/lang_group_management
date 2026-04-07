-- Functions

CREATE OR REPLACE FUNCTION create_group(name text, description text)
RETURNS json AS $$
DECLARE
  group_id int;
BEGIN
  INSERT INTO groups (name, description) VALUES (name, description) RETURNING id INTO group_id;
  RETURN json_build_object('id', group_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_member(group_id int, user_id text, role text DEFAULT 'member')
RETURNS json AS $$
DECLARE
  member_id int;
BEGIN
  INSERT INTO members (group_id, user_id, role) VALUES (group_id, user_id, role) RETURNING id INTO member_id;
  RETURN json_build_object('id', member_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_inventory(item_id int, amount int)
RETURNS json AS $$
BEGIN
  -- Assuming T_INVENTORY has M_INVENTORY_ID, AMOUNT, CREATED_DATETIME
  INSERT INTO T_INVENTORY (M_INVENTORY_ID, AMOUNT, CREATED_DATETIME) VALUES (item_id, amount, NOW());
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
