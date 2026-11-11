-- Promove a conta principal do proprietário do SaaS para Super Admin
UPDATE users
SET role = 'superadmin'
WHERE LOWER(email) = 'pedrogutierres@protonmail.com';
