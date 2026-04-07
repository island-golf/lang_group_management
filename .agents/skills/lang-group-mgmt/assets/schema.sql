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
