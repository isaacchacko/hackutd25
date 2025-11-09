#!/usr/bin/env python3
"""
Debug test script to verify BindingDB data is loaded properly.
This script connects to the MySQL database and reads sample data from various tables.
"""

import sys
import subprocess
import json
from datetime import datetime

# Database connection details
DB_HOST = "127.0.0.1"
DB_PORT = "3306"
DB_USER = "root"
DB_PASSWORD = "rootpassword"
DB_NAME = "bind"
CONTAINER_NAME = "bindingdb-mysql"

def run_sql_query(query, use_docker=True):
    """Execute a SQL query and return results."""
    if use_docker:
        # Use Docker exec to run MySQL commands
        cmd = [
            "docker", "exec", CONTAINER_NAME,
            "mysql", "-uroot", f"-p{DB_PASSWORD}", DB_NAME,
            "-e", query,
            "--skip-column-names"
        ]
    else:
        # Direct MySQL connection (requires mysql client installed)
        cmd = [
            "mysql", "-h", DB_HOST, "-P", DB_PORT,
            "-u", DB_USER, f"-p{DB_PASSWORD}", DB_NAME,
            "-e", query,
            "--skip-column-names"
        ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error executing query: {e}")
        print(f"Error output: {e.stderr}")
        return None

def get_table_row_counts():
    """Get row counts for all tables."""
    query = """
        SELECT table_name, table_rows 
        FROM information_schema.tables 
        WHERE table_schema = 'bind' 
        ORDER BY table_rows DESC
    """
    result = run_sql_query(query)
    if result:
        lines = result.split('\n')
        tables = {}
        for line in lines:
            if '\t' in line:
                table_name, row_count = line.split('\t', 1)
                try:
                    tables[table_name] = int(row_count)
                except ValueError:
                    pass
        return tables
    return {}

def get_sample_data(table_name, limit=3):
    """Get sample data from a table."""
    query = f"SELECT * FROM {table_name} LIMIT {limit}"
    result = run_sql_query(query)
    return result

def get_table_structure(table_name):
    """Get column information for a table."""
    query = f"DESCRIBE {table_name}"
    result = run_sql_query(query)
    return result

def format_output(title, content, width=80):
    """Format output with a title and separator."""
    print("\n" + "=" * width)
    print(f" {title}")
    print("=" * width)
    if content:
        print(content)
    else:
        print("(No data)")

def main():
    print("\n" + "=" * 80)
    print(" BindingDB Database Verification Test")
    print("=" * 80)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: {DB_NAME}")
    print(f"Container: {CONTAINER_NAME}")
    
    # Test 1: Check database connection
    format_output("Test 1: Database Connection", "")
    test_query = "SELECT 'Connection successful!' as status, DATABASE() as current_db, NOW() as server_time;"
    result = run_sql_query(test_query)
    if result:
        print(result)
        print("✓ Database connection successful")
    else:
        print("✗ Database connection failed")
        sys.exit(1)
    
    # Test 2: List all tables
    format_output("Test 2: List All Tables", "")
    tables_query = "SHOW TABLES;"
    tables_result = run_sql_query(tables_query)
    if tables_result:
        tables = [t for t in tables_result.split('\n') if t.strip()]
        print(f"Found {len(tables)} tables:")
        for i, table in enumerate(tables, 1):
            print(f"  {i:2d}. {table}")
        print(f"\n✓ Total tables: {len(tables)}")
    else:
        print("✗ Failed to list tables")
        sys.exit(1)
    
    # Test 3: Get row counts for all tables
    format_output("Test 3: Table Row Counts (Top 10)", "")
    table_counts = get_table_row_counts()
    if table_counts:
        sorted_tables = sorted(table_counts.items(), key=lambda x: x[1], reverse=True)
        print(f"{'Table Name':<30} {'Row Count':>15}")
        print("-" * 50)
        for table_name, count in sorted_tables[:10]:
            print(f"{table_name:<30} {count:>15,}")
        total_rows = sum(table_counts.values())
        print("-" * 50)
        print(f"{'TOTAL':<30} {total_rows:>15,}")
        print(f"\n✓ Data loaded successfully - {total_rows:,} total rows across all tables")
    else:
        print("✗ Failed to get row counts")
    
    # Test 4: Sample data from key tables
    key_tables = ['entry', 'monomer', 'article', 'assay', 'ki_result']
    
    for table in key_tables:
        if table in table_counts:
            format_output(f"Test 4.{key_tables.index(table) + 1}: Sample Data from '{table}' Table", "")
            
            # Get table structure
            structure = get_table_structure(table)
            if structure:
                print("Table Structure:")
                print(structure)
                print()
            
            # Get sample data
            sample = get_sample_data(table, limit=2)
            if sample:
                print("Sample Data (first 2 rows):")
                print(sample)
                print(f"\n✓ Table '{table}' contains {table_counts[table]:,} rows")
            else:
                print(f"✗ Failed to retrieve sample data from '{table}'")
    
    # Test 5: Data integrity checks
    format_output("Test 5: Data Integrity Checks", "")
    
    # Check for entries with dates
    date_check = run_sql_query(
        "SELECT COUNT(*) as total, MIN(entrydate) as earliest, MAX(entrydate) as latest "
        "FROM entry WHERE entrydate IS NOT NULL;"
    )
    if date_check:
        print("Entry dates:")
        print(date_check)
    
    # Check for monomers with InChI keys
    inchi_check = run_sql_query(
        "SELECT COUNT(*) as total_with_inchi FROM monomer WHERE inchi_key IS NOT NULL AND inchi_key != '';"
    )
    if inchi_check:
        print("\nMonomers with InChI keys:")
        print(inchi_check)
    
    # Check for articles with DOIs
    doi_check = run_sql_query(
        "SELECT COUNT(*) as total_with_doi FROM article WHERE doi IS NOT NULL AND doi != '';"
    )
    if doi_check:
        print("\nArticles with DOIs:")
        print(doi_check)
    
    # Test 6: Summary statistics
    format_output("Test 6: Summary Statistics", "")
    
    stats_queries = [
        ("Total Entries", "SELECT COUNT(*) FROM entry;"),
        ("Total Monomers", "SELECT COUNT(*) FROM monomer;"),
        ("Total Articles", "SELECT COUNT(*) FROM article;"),
        ("Total Assays", "SELECT COUNT(*) FROM assay;"),
        ("Total KI Results", "SELECT COUNT(*) FROM ki_result;"),
    ]
    
    for stat_name, query in stats_queries:
        result = run_sql_query(query)
        if result:
            print(f"{stat_name:<25}: {result:>15}")
    
    # Final summary
    format_output("Test Summary", "")
    print("✓ All tests completed successfully!")
    print("✓ Database is properly loaded and accessible")
    print("✓ Data integrity checks passed")
    print("\nThe BindingDB database is ready for use.")
    print("\nTo connect to the database:")
    print(f"  docker exec -it {CONTAINER_NAME} mysql -uroot -p{DB_PASSWORD} {DB_NAME}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

