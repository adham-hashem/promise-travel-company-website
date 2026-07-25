-- Add sales_agent_submitted column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_agent_submitted BOOLEAN DEFAULT true;

-- Add sales_agent_submitted to the table index
CREATE INDEX IF NOT EXISTS idx_customers_sales_agent_submitted ON customers(sales_agent_submitted);
