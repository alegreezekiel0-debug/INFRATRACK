CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  fullName VARCHAR(255) NOT NULL,
  studentId VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'student',
  createdAt VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(100) PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  photo LONGTEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  createdAt VARCHAR(40) NOT NULL,
  INDEX idx_reports_user (userId),
  INDEX idx_reports_status (status)
);

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reportId VARCHAR(100) NOT NULL,
  author VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL,
  text TEXT NOT NULL,
  date VARCHAR(40) NOT NULL,
  INDEX idx_comments_report (reportId)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actorId VARCHAR(100),
  actorName VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  reportId VARCHAR(100) NOT NULL,
  reportTitle VARCHAR(255) NOT NULL,
  occurredAt VARCHAR(40) NOT NULL,
  INDEX idx_activity_time (occurredAt),
  INDEX idx_activity_report (reportId)
);

UPDATE reports SET status = 'Ongoing' WHERE status = 'In Progress';
UPDATE reports SET status = 'Done' WHERE status = 'Resolved';
