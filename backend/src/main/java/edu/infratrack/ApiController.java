package edu.infratrack;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {
    private final JdbcTemplate jdbc;

    public ApiController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        return Map.of("status", "ok", "database", "connected");
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users() {
        return jdbc.queryForList("SELECT id, fullName, studentId, email, password, role, createdAt FROM users ORDER BY createdAt");
    }

    @GetMapping("/admin/users")
    public List<Map<String, Object>> adminUsers() {
        return jdbc.queryForList("SELECT id,fullName,studentId,role FROM users ORDER BY fullName");
    }

    @PutMapping("/users")
    @Transactional
    public Map<String, Boolean> saveUsers(@RequestBody List<Map<String, Object>> users) {
        for (Map<String, Object> user : users) {
            jdbc.update("INSERT INTO users (id,fullName,studentId,email,password,role,createdAt) VALUES (?,?,?,?,?,?,?) " +
                            "ON DUPLICATE KEY UPDATE fullName=VALUES(fullName), studentId=VALUES(studentId), email=VALUES(email), password=VALUES(password), role=VALUES(role), createdAt=VALUES(createdAt)",
                    value(user, "id"), value(user, "fullName"), value(user, "studentId"), value(user, "email"), value(user, "password"),
                    defaultValue(user, "role", "student"), defaultValue(user, "createdAt", java.time.Instant.now().toString()));
        }
        return Map.of("success", true);
    }

    @GetMapping("/reports")
    public List<Map<String, Object>> reports() {
        return jdbc.queryForList("SELECT id,userId,title,location,description,photo,status,createdAt FROM reports ORDER BY createdAt");
    }

    @PutMapping("/reports")
    @Transactional
    public Map<String, Boolean> saveReports(@RequestBody List<Map<String, Object>> reports) {
        for (Map<String, Object> report : reports) {
            String status = String.valueOf(defaultValue(report, "status", "Pending"));
            if (status.equals("In Progress")) status = "Ongoing";
            if (status.equals("Resolved")) status = "Done";
            if (!List.of("Pending", "Ongoing", "Done").contains(status)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid report status");
            }
            jdbc.update("INSERT INTO reports (id,userId,title,location,description,photo,status,createdAt) VALUES (?,?,?,?,?,?,?,?) " +
                            "ON DUPLICATE KEY UPDATE userId=VALUES(userId),title=VALUES(title),location=VALUES(location),description=VALUES(description),photo=VALUES(photo),status=VALUES(status),createdAt=VALUES(createdAt)",
                    value(report, "id"), value(report, "userId"), value(report, "title"), value(report, "location"), value(report, "description"),
                    report.get("photo"), status, defaultValue(report, "createdAt", java.time.Instant.now().toString()));
        }
        return Map.of("success", true);
    }

    @GetMapping("/reports/{reportId}/comments")
    public List<Map<String, Object>> comments(@PathVariable String reportId) {
        return jdbc.queryForList("SELECT author,role,text,date FROM comments WHERE reportId=? ORDER BY id", reportId);
    }

    @PostMapping("/reports/{reportId}/comments")
    public Map<String, Boolean> addComment(@PathVariable String reportId, @RequestBody Map<String, Object> comment) {
        jdbc.update("INSERT INTO comments (reportId,author,role,text,date) VALUES (?,?,?,?,?)",
                reportId, value(comment, "author"), defaultValue(comment, "role", "student"), value(comment, "text"),
                defaultValue(comment, "date", java.time.Instant.now().toString()));
        return Map.of("success", true);
    }

    @GetMapping("/activity")
    public List<Map<String, Object>> activity() {
        return jdbc.queryForList("SELECT id,actorId,actorName,action,reportId,reportTitle,occurredAt FROM activity_log ORDER BY occurredAt DESC,id DESC");
    }

    @PostMapping("/activity")
    public Map<String, Boolean> addActivity(@RequestBody Map<String, Object> activity) {
        jdbc.update("INSERT INTO activity_log (actorId,actorName,action,reportId,reportTitle,occurredAt) VALUES (?,?,?,?,?,?)",
                activity.get("actorId"), value(activity, "actorName"), value(activity, "action"), value(activity, "reportId"),
                value(activity, "reportTitle"), defaultValue(activity, "occurredAt", java.time.Instant.now().toString()));
        return Map.of("success", true);
    }

    @DeleteMapping("/reports/{reportId}")
    @Transactional
    public Map<String, Boolean> deleteReport(@PathVariable String reportId) {
        jdbc.update("DELETE FROM comments WHERE reportId=?", reportId);
        jdbc.update("DELETE FROM reports WHERE id=?", reportId);
        return Map.of("success", true);
    }

    private Object value(Map<String, Object> map, String key) {
        Object result = map.get(key);
        if (result == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing field: " + key);
        return result;
    }

    private Object defaultValue(Map<String, Object> map, String key, Object fallback) {
        Object result = map.get(key);
        return result == null || result.toString().isBlank() ? fallback : result;
    }
}
