-- PostgreSQL trigger on customers table to set sales_agent_submitted to false for website bookings

CREATE OR REPLACE FUNCTION handle_website_customer_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source = 'Website' THEN
    NEW.sales_agent_submitted := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_website_customer_insert ON customers;
CREATE TRIGGER trg_website_customer_insert
BEFORE INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION handle_website_customer_insert();
