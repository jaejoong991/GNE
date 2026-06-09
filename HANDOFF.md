# Handoff: Adempiere Docker Setup

## Status: Framework Complete — Awaiting Adempiere Binaries

The Docker Compose environment for **Adempiere + PostgreSQL 9.2 + Java 7** is scaffolded and ready. It has **not** been built or run yet because the Adempiere application binaries have not been provided.

---

## What Was Done

1. **Docker Compose orchestration** (`docker-compose.yml`)
   - `db` service: official `postgres:9.2` image with healthcheck.
   - `adempiere` service: custom build from `./adempiere` with Java 7.
   - Persistent volumes: `pgdata` (database), `adempiere-data` (app data).
   - Ports exposed: `8080` (Adempiere Web), `8443` (SSL), `5432` (PostgreSQL).

2. **Adempiere application image** (`adempiere/Dockerfile`)
   - Base: `ubuntu:14.04` (EOL; uses `old-releases.ubuntu.com` for apt).
   - Runtime: `openjdk-7-jre-headless`.
   - Utilities: `wget`, `unzip`, `postgresql-client`, `netcat-openbsd`.
   - Expects Adempiere files at `adempiere/Adempiere/` → copied to `/opt/Adempiere`.

3. **Entrypoint automation** (`adempiere/docker-entrypoint.sh`)
   - Waits for PostgreSQL to accept connections.
   - Generates `AdempiereEnv.properties` from environment variables if missing.
   - Detects whether the database is already seeded (checks `ad_client` table).
   - Runs `utils/RUN_ImportAdempiere.sh` automatically on first startup.
   - Starts `utils/RUN_Server2.sh`.

4. **Git safety** (`adempiere/.gitignore`)
   - Ignores `Adempiere/`, `*.zip`, `*.tar.gz` so large binaries are never committed.

5. **Documentation** (`README.md`)
   - Prerequisites for CentOS server.
   - Step-by-step instructions for adding binaries, building, running, and exporting images.

---

## What Is Blocked / Waiting

| Item | Owner | Notes |
|------|-------|-------|
| Adempiere binaries | User | Extracted Adempiere folder must be placed in `adempiere/Adempiere/` before `docker-compose build` can succeed. |
| Build verification | — | Dockerfile `COPY Adempiere/` will fail if the directory does not exist. |
| DB seed verification | — | `RUN_ImportAdempiere.sh` behavior depends on the exact Adempiere version (assumed 3.8.0 LTS or compatible). |
| JBoss bind address | — | If Adempiere/JBoss binds to `127.0.0.1` inside the container, it will be unreachable from the host. May need to enforce `-b 0.0.0.0` or edit JBoss config. |

---

## Next Steps to Complete

1. **Receive Adempiere binaries** from user.
2. **Place binaries** in `adempiere/Adempiere/` (contents should include `utils/`, `jboss/`, `RUN_setup.sh`, etc.).
3. **Build images**:
   ```bash
   docker-compose build
   ```
4. **Start stack**:
   ```bash
   docker-compose up -d
   ```
5. **Monitor logs** on first run:
   ```bash
   docker-compose logs -f adempiere
   ```
   - Confirm `RUN_ImportAdempiere.sh` completes without errors.
   - Confirm JBoss starts and reports `Started in xx:xx:xx ms`.
6. **Test access**: Browse to `http://localhost:8080` (or server IP).
7. **Fix JBoss bind address** if connection refused from host:
   - Option A: Modify `jboss/server/adempiere/deploy/jboss-web.deployer/server.xml` inside the image to bind to `0.0.0.0`.
   - Option B: Override startup command to pass `-b 0.0.0.0` to JBoss run script.
8. **Export for target server** (optional):
   ```bash
   docker save adempiere-gne_adempiere:latest | gzip > adempiere-app.tar.gz
   docker save postgres:9.2 | gzip > postgres92.tar.gz
   ```
   Transfer `*.tar.gz` + `docker-compose.yml` to the CentOS server, load, and run.

---

## Known Risks & Assumptions

- **Ubuntu 14.04 is EOL.** The Dockerfile forces `old-releases.ubuntu.com`. If that mirror disappears, the base image must be rebuilt using a different approach (e.g., manual OpenJDK 7 tarball installation on `debian:8` or a scratch image).
- **PostgreSQL 9.2 is EOL.** The official `postgres:9.2` image still pulls today but may be removed from Docker Hub in the future. Consider mirroring it.
- **Adempiere version compatibility** is assumed but not guaranteed. If the user provides a version other than 3.8.0 LTS, startup scripts or Java requirements may differ.
- **Database import is destructive.** `RUN_ImportAdempiere.sh` drops and recreates the `adempiere` database. The entrypoint attempts to guard against re-import by checking for the `ad_client` table, but verify this logic works with the specific Adempiere release provided.
- **Silent setup vs. GUI setup.** The entrypoint generates `AdempiereEnv.properties` manually. If the provided Adempiere version expects different keys or a different silent-setup mechanism, the entrypoint will need adjustment.

---

## File Inventory

```
GNE/
├── docker-compose.yml          # Service orchestration
├── README.md                   # User-facing docs
├── HANDOFF.md                  # This file
└── adempiere/
    ├── Dockerfile              # App image build definition
    ├── docker-entrypoint.sh    # Startup logic (executable)
    ├── .gitignore              # Excludes large binaries
    └── Adempiere/              # (PLACEHOLDER — user to provide)
        ├── RUN_setup.sh
        ├── utils/
        │   ├── RUN_ImportAdempiere.sh
        │   └── RUN_Server2.sh
        └── ...
```

---

## Quick Reference Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f adempiere

# Shell into app container
docker exec -it adempiere-app bash

# Shell into DB container
docker exec -it adempiere-db psql -U postgres

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (DESTRUCTIVE)
docker-compose down -v
```
