DROP TABLE IF EXISTS todos;
CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, done INTEGER DEFAULT 0);
INSERT INTO todos (id, name, done) VALUES (1, 'todo 1', 0), (2, 'todod 2', 1);
