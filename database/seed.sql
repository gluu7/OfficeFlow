INSERT INTO schools (school_name, school_domain)
VALUES ('Orange Coast College', 'occ.cccd.edu')
ON CONFLICT (school_domain) DO NOTHING;