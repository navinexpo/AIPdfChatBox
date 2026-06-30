-- Run this in psql as postgres superuser: psql -U postgres -f setup_db.sql
CREATE DATABASE docked;
CREATE USER docked WITH PASSWORD 'docked';
GRANT ALL PRIVILEGES ON DATABASE docked TO docked;
\connect docked
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
