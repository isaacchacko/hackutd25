#!/bin/bash

# Script to set up BindingDB MySQL database using Docker
# This script will:
# 1. Start a MySQL container
# 2. Create the 'bind' database
# 3. Load the BindingDB dump file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_FILE="$SCRIPT_DIR/BDB-mySQL_All_202511.dmp"
DB_NAME="bind"
CONTAINER_NAME="bindingdb-mysql"
MYSQL_ROOT_PASSWORD="rootpassword"
MYSQL_PORT="3306"

echo "=== BindingDB Database Setup (Docker) ==="
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if dump file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: Dump file not found at $DUMP_FILE"
    exit 1
fi

# Stop and remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Stopping existing container..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    echo "Removing existing container..."
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
fi

echo "Starting MySQL container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
    -e MYSQL_DATABASE="$DB_NAME" \
    -p "$MYSQL_PORT:3306" \
    mysql:8.4 \
    --character-set-server=utf8mb4 \
    --collation-server=utf8mb4_unicode_ci

echo "Waiting for MySQL to be ready..."
sleep 10

# Wait for MySQL to be actually ready
for i in {1..30}; do
    if docker exec "$CONTAINER_NAME" mysqladmin ping -h localhost --silent; then
        echo "MySQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Error: MySQL did not start in time"
        exit 1
    fi
    sleep 2
done

echo ""
echo "Creating database '$DB_NAME'..."
docker exec -i "$CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Database '$DB_NAME' created successfully."
echo ""
echo "Loading BindingDB data (this may take a while, file is 2.3GB)..."
echo "This process can take 10-30 minutes depending on your system."

# Load the dump file
docker exec -i "$CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" < "$DUMP_FILE"

echo ""
echo "=== Database setup complete! ==="
echo "Database '$DB_NAME' has been created and loaded with BindingDB data."
echo ""
echo "Container name: $CONTAINER_NAME"
echo "MySQL root password: $MYSQL_ROOT_PASSWORD"
echo "MySQL port: $MYSQL_PORT"
echo ""
echo "You can connect to the database with:"
echo "  docker exec -it $CONTAINER_NAME mysql -uroot -p$MYSQL_ROOT_PASSWORD $DB_NAME"
echo ""
echo "Or from your host machine:"
echo "  mysql -h 127.0.0.1 -P $MYSQL_PORT -u root -p$MYSQL_ROOT_PASSWORD $DB_NAME"
echo ""
echo "To stop the container: docker stop $CONTAINER_NAME"
echo "To start it again: docker start $CONTAINER_NAME"

