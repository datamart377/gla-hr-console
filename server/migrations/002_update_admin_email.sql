-- Change the admin login + profile + company email to the new address (no data loss).
UPDATE users
   SET email = 'glassociates.ug@gmail.com'
 WHERE email = 'r.okello@glassociates.co.ug';
UPDATE employees
   SET doc = jsonb_set(jsonb_set(doc, '{email}', '"glassociates.ug@gmail.com"'), '{contact,email}', '"glassociates.ug@gmail.com"')
 WHERE id = 'GLA-001';
UPDATE settings
   SET value = jsonb_set(value, '{company,email}', '"glassociates.ug@gmail.com"')
 WHERE key = 'app';
