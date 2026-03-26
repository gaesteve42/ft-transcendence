# Disaster Recovery — GameFinder

## When to use this

- Database issues or accidental data deletion
- Need to restore after `make reset-db` or `make fclean`
- Any situation where you need to roll back to a good DB state


## 1. Create a backup (before making risky changes)

```bash
make backup
# or
bash scripts/backup.sh
```

Backups are stored in `backups/` as `gamefinder_YYYYMMDD_HHMMSS.sql.gz`.

ISO format are for better data management. Use this for french format output with `ls` or `find` :

```bash
date "+%d/%m/%Y %H:%M:%S"
```

Files older than 7 days are automatically removed.

---

## 2. Schedule automatic daily backups (cron)

```bash
crontab -e
```

This will trigger an `$EDITOR` choice prompt if it's first time you lauch it.

Add this line (runs at 2:00 AM every day):

```
0 2 * * * cd /absolute/path/to/ft-transcendance-health && make backup >> backups/backup.log 2>&1
```

Replace `/absolute/path/to/ft-transcendance-health` with the actual path.

---

## 3. List available backups

```bash
ls -lh backups/
```

---

## 4. Restore procedure

### Step 1 — Make sure postgres is running

```bash
docker compose up -d postgres
# Wait for it to be healthy:
docker compose ps postgres
```

### Step 2 — (Optional) Drop and recreate the database for a clean restore

Do this if you need to start from scratch.

```bash
docker compose exec postgres psql -U $POSTGRES_USER -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
docker compose exec postgres psql -U $POSTGRES_USER -c "CREATE DATABASE $POSTGRES_DB;"
```

### Step 3 — Restore from backup file

```bash
# Replace TIMESTAMP with the actual filename
gunzip -c backups/gamefinder_TIMESTAMP.sql.gz \
  | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

Example:

```bash
gunzip -c backups/gamefinder_20260311_020000.sql.gz \
  | docker compose exec -T postgres psql -U gamefinder gamefinder_db
```

### Step 4 — Restart and verify

```bash
make up

# Check logs for backend migration output
docker compose logs -f backend
# Verify data in PgAdmin at http://localhost:5050 or your favorite database tool
```

---

## Quick reference

| Action | Command |
|--------|---------|
| Manual backup | `make backup` |
| List backups | `ls -lh backups/` |
| Restore DB | `gunzip -c backups/<file>.sql.gz \| docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB` |
| Reset DB (wipes everything) | `make reset-db` |
