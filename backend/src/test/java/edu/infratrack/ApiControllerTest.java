package edu.infratrack;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

class ApiControllerTest {
    @Test
    void savesSupportedReportStatuses() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate();
        ApiController controller = new ApiController(jdbc);

        for (String status : List.of("Pending", "Ongoing", "Done")) {
            controller.saveReports(List.of(report(status)));
            assertEquals(status, jdbc.lastArguments[6]);
        }
    }

    @Test
    void mapsLegacyReportStatuses() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate();
        ApiController controller = new ApiController(jdbc);

        controller.saveReports(List.of(report("In Progress")));
        assertEquals("Ongoing", jdbc.lastArguments[6]);

        controller.saveReports(List.of(report("Resolved")));
        assertEquals("Done", jdbc.lastArguments[6]);
    }

    @Test
    void rejectsUnsupportedReportStatusBeforeWriting() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate();
        ApiController controller = new ApiController(jdbc);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.saveReports(List.of(report("Unknown"))));

        assertEquals(400, exception.getStatusCode().value());
        assertEquals(0, jdbc.updateCount);
    }

    private Map<String, Object> report(String status) {
        return Map.of(
                "id", "test-report",
                "userId", "test-user",
                "title", "Test report",
                "location", "Test location",
                "description", "Test description",
                "status", status,
                "createdAt", "2026-10-25T00:00:00Z");
    }

    private static class RecordingJdbcTemplate extends JdbcTemplate {
        private Object[] lastArguments;
        private int updateCount;

        @Override
        public int update(String sql, Object... args) {
            lastArguments = args;
            updateCount++;
            return 1;
        }
    }
}
