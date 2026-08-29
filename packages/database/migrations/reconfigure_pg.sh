#!/bin/bash
set -e

# Enable listen_addresses
sudo sed -i "s/^#listen_addresses = .*/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf

# Add host entry for Windows host (WS2 gateway) - allow all internal IPs
echo "host    all    all    172.16.0.0/12    scram-sha-256" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf > /dev/null

# Restart PostgreSQL
sudo service postgresql restart

echo "PostgreSQL reconfigured and restarted"
