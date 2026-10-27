# InfraTrack

InfraTrack is a campus maintenance reporting desktop app with an Electron frontend, Java Spring Boot backend, and MySQL database.

## Run on Windows

Install Node.js, Java 17 or newer, Maven, and MySQL Server. Then:

1. In MySQL Workbench, run `backend/setup.sql` to create the `infratrack` database and tables.
2. From the project folder, run `npm install` to install the desktop app dependencies.
3. Double-click `InfraTrack.bat` and enter your local MySQL root password when prompted.
4. Create an InfraTrack account from the app's sign-up page.

The app connects to the local MySQL server by default. Each groupmate who downloads the project and runs the setup will have a separate local database.

## Database and shared access

GitHub stores the project files and SQL schema; it does not host the running MySQL database. `backend/setup.sql` creates empty tables and does not contain anyone's account or report data. To share one live set of reports across computers, the MySQL database and Java backend must be hosted online, and the app must be configured to use that hosted backend.

Keep database passwords and private account data out of GitHub. Do not commit `node_modules`, generated backend files, or local database files.
