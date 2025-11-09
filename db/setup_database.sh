#!/bin/bash

# Script to set up BindingDB MySQL database
# This script will:
# 1. Check if MySQL/MariaDB is installed
# 2. Install MariaDB if needed (requires sudo)
# 3. Initialize and start the database service
# 4. Create the 'bind' database
# 5. Load the BindingDB dump file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_FILE="$SCRIPT_DIR/BDB-mySQL_All_202511.dmp"
DB_NAME="bind"

echo "=== BindingDB Database Setup ==="
echo ""

# Check if MySQL/MariaDB client is available
if ! command -v mysql &> /dev/null && ! command -v mariadb &> /dev/null; then
    echo "MySQL/MariaDB client not found. Installing MariaDB..."
    echo "This requires sudo privileges."
    sudo pacman -S --noconfirm mariadb
    echo "MariaDB installed successfully."
else
    echo "MySQL/MariaDB client found."
fi

# Check if MySQL/MariaDB service is running
if systemctl is-active --quiet mariadb || systemctl is-active --quiet mysql; then
    echo "Database service is already running."
else
    echo "Starting database service..."
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
    echo "Database service started."
fi

# Initialize database if needed (first time setup)
if [ ! -d "/var/lib/mysql/mysql" ]; then
    echo "Initializing MariaDB database (first time setup)..."
    sudo mysql_install_db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
    sudo systemctl start mariadb
    echo "Database initialized."
fi

# Check if dump file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: Dump file not found at $DUMP_FILE"
    exit 1
fi

echo ""
echo "Creating database '$DB_NAME'..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" || {
    echo "Error: Could not create database. You may need to set up MySQL root password."
    echo "Try running: sudo mysql_secure_installation"
    echo "Or if no password is set, try: mysql -u root -e \"CREATE DATABASE IF NOT EXISTS $DB_NAME;\""
    exit 1
}

echo "Database '$DB_NAME' created successfully."
echo ""
echo "Loading BindingDB data (this may take a while, file is 2.3GB)..."
echo "This process can take 10-30 minutes depending on your system."

# Load the dump file
mysql -u root "$DB_NAME" < "$DUMP_FILE" || {
    echo "Error: Failed to load dump file."
    exit 1
}

echo ""
echo "=== Database setup complete! ==="
echo "Database '$DB_NAME' has been created and loaded with BindingDB data."
echo ""
echo "You can now connect to the database with:"
echo "  mysql -u root $DB_NAME"

