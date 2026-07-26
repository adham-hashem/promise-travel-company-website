-- Add employee_response column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS employee_response TEXT;
