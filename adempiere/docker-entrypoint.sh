#!/bin/bash
set -e

ADEMPIERE_HOME=${ADEMPIERE_HOME:-/opt/Adempiere}
JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-7-openjdk-amd64}

export PATH="$JAVA_HOME/bin:$PATH"

echo "Waiting for PostgreSQL at ${ADEMPIERE_DB_SERVER}:${ADEMPIERE_DB_PORT}..."
while ! nc -z "${ADEMPIERE_DB_SERVER}" "${ADEMPIERE_DB_PORT}"; do
  sleep 1
done
echo "PostgreSQL is available."

# Generate AdempiereEnv.properties if missing
ENV_FILE="$ADEMPIERE_HOME/AdempiereEnv.properties"
if [ ! -f "$ENV_FILE" ]; then
    echo "Generating AdempiereEnv.properties..."
    cat > "$ENV_FILE" <<EOF
ADEMPIERE_HOME=$ADEMPIERE_HOME
JAVA_HOME=$JAVA_HOME
ADEMPIERE_DB_SERVER=${ADEMPIERE_DB_SERVER:-db}
ADEMPIERE_DB_PORT=${ADEMPIERE_DB_PORT:-5432}
ADEMPIERE_DB_NAME=${ADEMPIERE_DB_NAME:-adempiere}
ADEMPIERE_DB_USER=${ADEMPIERE_DB_USER:-adempiere}
ADEMPIERE_DB_PASSWORD=${ADEMPIERE_DB_PASSWORD:-adempiere}
ADEMPIERE_DB_SYSTEM=${ADEMPIERE_DB_SYSTEM:-postgres}
ADEMPIERE_DB_TYPE=${ADEMPIERE_DB_TYPE:-PostgreSQL}
ADEMPIERE_WEB_PORT=${ADEMPIERE_WEB_PORT:-8080}
ADEMPIERE_SSL_PORT=${ADEMPIERE_SSL_PORT:-8443}
ADEMPIERE_MAIL_SERVER=${ADEMPIERE_MAIL_SERVER:-localhost}
ADEMPIERE_ADMIN_EMAIL=${ADEMPIERE_ADMIN_EMAIL:-admin@localhost}
ADEMPIERE_MAIL_USER=
ADEMPIERE_MAIL_PASSWORD=
ADEMPIERE_KEYSTORE=$ADEMPIERE_HOME/keystore/myKeystore
EOF
fi

# Check if database already seeded by looking for ad_client table
DB_SEEDED=0
if PGPASSWORD="${ADEMPIERE_DB_PASSWORD}" psql -h "${ADEMPIERE_DB_SERVER}" -p "${ADEMPIERE_DB_PORT}" -U "${ADEMPIERE_DB_USER}" -d "${ADEMPIERE_DB_NAME}" -t -c "SELECT 1 FROM ad_client LIMIT 1" >/dev/null 2>&1; then
    DB_SEEDED=1
fi

if [ "$DB_SEEDED" -eq 0 ]; then
    echo "Database not seeded. Running RUN_ImportAdempiere.sh..."
    cd "$ADEMPIERE_HOME/utils"
    if [ -f "RUN_ImportAdempiere.sh" ]; then
        ./RUN_ImportAdempiere.sh
    else
        echo "WARNING: RUN_ImportAdempiere.sh not found. Please seed the database manually."
    fi
else
    echo "Database already seeded. Skipping import."
fi

echo "Starting Adempiere..."
cd "$ADEMPIERE_HOME"
exec "$@"
