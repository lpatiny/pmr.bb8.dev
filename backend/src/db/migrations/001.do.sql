CREATE TABLE IF NOT EXISTS day_trains (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  date TEXT NOT NULL,
  trains TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (from_id, to_id, date)
);
