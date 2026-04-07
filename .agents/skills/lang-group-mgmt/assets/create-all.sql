-- Full schema and functions script for lang_group_management

-- Tables for inventory management

CREATE TABLE IF NOT EXISTS M_INVENTORY (
  ID SERIAL PRIMARY KEY,
  ITEM_DESC TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS T_INVENTORY (
  ID SERIAL PRIMARY KEY,
  M_INVENTORY_ID INT REFERENCES M_INVENTORY(ID),
  AMOUNT INT NOT NULL,
  CREATED_DATETIME TIMESTAMP DEFAULT NOW()
);

-- Tables for language group management

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  group_id INT REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policies (example)
CREATE POLICY "Users can view groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create groups" ON groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Similar policies for members

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
