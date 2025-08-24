SELECT migration_name, started_at, finished_at 
FROM _prisma_migrations 
ORDER BY started_at DESC 
LIMIT 20;