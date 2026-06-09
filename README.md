# Adempiere Docker Setup

PostgreSQL 9.2 + Java 7 + Adempiere in Docker.

## Prerequisites (CentOS Server)

Install Docker Engine and Docker Compose:

```bash
# CentOS 7/8/Stream
sudo yum install -y docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

## How to Add Your Adempiere Files

1. Extract your Adempiere release (e.g., 3.8.0 LTS).
2. Copy the **contents** of the extracted `Adempiere/` folder into:
   ```
   adempiere/Adempiere/
   ```
   So that files like `RUN_setup.sh`, `utils/`, `jboss/`, etc. are inside `adempiere/Adempiere/`.

## Build and Run

```bash
docker-compose up -d
```

- Adempiere Web UI: http://your-server-ip:8080
- PostgreSQL port: `5432` (exposed if you need external access)

## First Run

On first start the entrypoint will:
1. Wait for PostgreSQL to be ready.
2. Generate `AdempiereEnv.properties` if missing.
3. Run `RUN_ImportAdempiere.sh` to seed the database if it is empty.
4. Start the Adempiere server (`RUN_Server2.sh`).

## Login

Default web admin: `http://server-ip:8080/admin`  
Default client login after server starts:
- Role: `GardenAdmin`
- User: `GardenAdmin`
- Password: `GardenAdmin`

(Change defaults in production.)

## Persistent Data

Docker volumes keep data between restarts:
- `pgdata` – PostgreSQL database files
- `adempiere-data` – Adempiere data directory

## Export Image for Another Server

If you want a single portable image without rebuilding on the new server:

```bash
# After placing Adempiere files and building
docker-compose build

# Save the app image
docker save adempiere-gne_adempiere:latest | gzip > adempiere-app.tar.gz

# Save the DB image (optional, or just use postgres:9.2 on target)
docker save postgres:9.2 | gzip > postgres92.tar.gz
```

On the new CentOS server:
```bash
# Install Docker, then load images
docker load -i adempiere-app.tar.gz
docker load -i postgres92.tar.gz

# Copy docker-compose.yml and run
docker-compose up -d
```

## Notes

- This setup uses `postgres:9.2` from Docker Hub (official image).
- Java 7 is installed from Ubuntu 14.04 archives because modern OpenJDK 7 images are deprecated.
- Make sure your Adempiere version is compatible with PostgreSQL 9.2 and Java 7.
