package edu.infratrack;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Restores the prior Electron SQLite database into a new, empty MySQL install. */
@Component
public class LegacyDataMigration implements ApplicationRunner {
    private final JdbcTemplate jdbc;

    public LegacyDataMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void run(ApplicationArguments args) throws Exception {
        Path legacyFile = legacyDatabasePath();
        if (!Files.isRegularFile(legacyFile)) return;

        List<Integer> counts = List.of(
                jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class),
                jdbc.queryForObject("SELECT COUNT(*) FROM reports", Integer.class),
                jdbc.queryForObject("SELECT COUNT(*) FROM comments", Integer.class),
                jdbc.queryForObject("SELECT COUNT(*) FROM activity_log", Integer.class));
        if (counts.stream().anyMatch(count -> count != 0)) {
            System.out.println("Legacy SQLite import skipped because InfraTrack MySQL already contains data.");
            return;
        }

        try (Connection legacy = DriverManager.getConnection("jdbc:sqlite:" + legacyFile.toAbsolutePath());
             Statement statement = legacy.createStatement()) {
            if (!hasTable(legacy, "users") || !hasTable(legacy, "reports")) {
                System.out.println("Legacy SQLite import skipped because the backup has no InfraTrack tables.");
                return;
            }

            copy(statement, "SELECT id,fullName,studentId,email,password,role,createdAt FROM users",
                    row -> jdbc.update("INSERT INTO users (id,fullName,studentId,email,password,role,createdAt) VALUES (?,?,?,?,?,?,?)",
                            row.getString(1), row.getString(2), row.getString(3), row.getString(4), row.getString(5), row.getString(6), row.getString(7)));
            copy(statement, "SELECT id,userId,title,location,description,photo,status,createdAt FROM reports",
                    row -> jdbc.update("INSERT INTO reports (id,userId,title,location,description,photo,status,createdAt) VALUES (?,?,?,?,?,?,?,?)",
                            row.getString(1), row.getString(2), row.getString(3), row.getString(4), row.getString(5), row.getString(6), normalizeStatus(row.getString(7)), row.getString(8)));

            if (hasTable(legacy, "comments")) {
                copy(statement, "SELECT reportId,author,role,text,date FROM comments",
                        row -> jdbc.update("INSERT INTO comments (reportId,author,role,text,date) VALUES (?,?,?,?,?)",
                                row.getString(1), row.getString(2), row.getString(3), row.getString(4), row.getString(5)));
            }
            if (hasTable(legacy, "activity_log")) {
                copy(statement, "SELECT actorId,actorName,action,reportId,reportTitle,occurredAt FROM activity_log",
                        row -> jdbc.update("INSERT INTO activity_log (actorId,actorName,action,reportId,reportTitle,occurredAt) VALUES (?,?,?,?,?,?)",
                                row.getString(1), row.getString(2), row.getString(3), row.getString(4), row.getString(5), row.getString(6)));
            }
            System.out.printf("Imported legacy InfraTrack SQLite data from %s%n", legacyFile);
        }
    }

    private Path legacyDatabasePath() {
        String configured = System.getenv("LEGACY_SQLITE_PATH");
        if (configured != null && !configured.isBlank()) return Path.of(configured);
        String appData = System.getenv("APPDATA");
        Path roaming = appData == null || appData.isBlank()
                ? Path.of(System.getProperty("user.home"), "AppData", "Roaming")
                : Path.of(appData);
        return roaming.resolve("infratrack-desktop").resolve("infratrack.sqlite");
    }

    private boolean hasTable(Connection connection, String table) throws Exception {
        try (var query = connection.prepareStatement("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")) {
            query.setString(1, table);
            try (ResultSet result = query.executeQuery()) {
                return result.next();
            }
        }
    }

    private void copy(Statement statement, String sql, RowConsumer consumer) throws Exception {
        try (ResultSet rows = statement.executeQuery(sql)) {
            while (rows.next()) consumer.accept(rows);
        }
    }

    private String normalizeStatus(String status) {
        if ("In Progress".equals(status)) return "Ongoing";
        if ("Resolved".equals(status)) return "Done";
        return status;
    }

    @FunctionalInterface
    private interface RowConsumer {
        void accept(ResultSet row) throws Exception;
    }
}
