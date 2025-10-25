-- Supabase Setup SQL for Event Check-in App
-- Copy and paste this SQL into your Supabase SQL Editor

-- Create the html_attendees table
CREATE TABLE html_attendees (
    id SERIAL PRIMARY KEY,
    table_number TEXT,
    group_name TEXT,
    attendee_name TEXT,
    ticket_type TEXT,
    status TEXT DEFAULT 'pending',
    checked_in_at TIMESTAMPTZ,
    row_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_html_attendees_name ON html_attendees(attendee_name);
CREATE INDEX idx_html_attendees_status ON html_attendees(status);
CREATE INDEX idx_html_attendees_table ON html_attendees(table_number);
CREATE INDEX idx_html_attendees_group ON html_attendees(group_name);

-- Enable Row Level Security (RLS)
ALTER TABLE html_attendees ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
-- Note: For public access, you might want to adjust this policy
CREATE POLICY "Allow all operations on html_attendees" ON html_attendees
FOR ALL USING (true);

-- Optional: Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row changes
CREATE TRIGGER update_html_attendees_updated_at 
    BEFORE UPDATE ON html_attendees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for easier querying
CREATE VIEW attendee_summary AS
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE checked_in_at IS NOT NULL) as checked_in_count
FROM html_attendees 
GROUP BY status;

-- Grant necessary permissions (adjust as needed for your security requirements)
-- GRANT ALL ON html_attendees TO authenticated;
-- GRANT ALL ON html_attendees TO anon;

-- Example data (optional - remove if not needed)
-- INSERT INTO html_attendees (table_number, group_name, attendee_name, ticket_type, status) VALUES
-- ('Table 1', 'VIP', 'John Doe', 'VIP Ticket', 'pending'),
-- ('Table 2', 'General', 'Jane Smith', 'General Admission', 'pending'),
-- ('Table 1', 'VIP', 'Bob Johnson', 'VIP Ticket', 'pending');

-- Verify the table was created successfully
SELECT 'Table created successfully' as status, COUNT(*) as total_rows FROM html_attendees;
