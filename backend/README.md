# InfraTrack MySQL setup

InfraTrack stores its application data in MySQL through the Spring Boot backend. Electron no longer uses a local SQLite database.

## First-time setup

1. Start MySQL Server.
2. Run `create-database.sql` in MySQL Workbench (or with the MySQL client) to create the `infratrack` database.
3. Set `DB_USERNAME` and `DB_PASSWORD` if your MySQL account differs from the local defaults in `src/main/resources/application.properties`.
4. From the project root, run `npm run backend`. Spring Boot applies `src/main/resources/schema.sql` to the database at startup.
5. In another terminal, run `npm start`, or launch `InfraTrack.bat` after MySQL and Maven are installed.

The backend listens on `http://localhost:8080`; its `/api/health` endpoint reports whether it connected to MySQL. For multiple computers to use one live dataset, run the backend on a computer that can reach the shared MySQL server, set `SERVER_ADDRESS=0.0.0.0` on that computer, and set the backend host's LAN address in `src/config.js` on each client (for example, `http://192.168.1.25:8080/api`). Allow the backend port through the host firewall only on the trusted group network.

The previous Electron SQLite file is left untouched as a local backup. New and changed data is written to MySQL.

When the backend starts with an empty MySQL database, it now checks the default Electron user-data path (`%APPDATA%\infratrack-desktop\infratrack.sqlite`) and imports users, reports, comments, and activity history if the legacy file is present. The SQLite file is read only and retained. If MySQL already contains any application data, the import is skipped to avoid mixing datasets. Set `LEGACY_SQLITE_PATH` to use a backup stored elsewhere.
