CREATE TABLE IF NOT EXISTS prompt_sessions (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    project_id INTEGER,
    input_payload TEXT,
    selected_version_id INTEGER,
    selected_title TEXT,
    selected_prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_sessions_user_id ON prompt_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_project_id ON prompt_sessions(project_id);

CREATE TABLE IF NOT EXISTS prompt_versions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    locked BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'generated',
    based_on_version_id INTEGER,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_prompt_versions_session
        FOREIGN KEY(session_id)
        REFERENCES prompt_sessions(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_session_id ON prompt_versions(session_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_is_selected ON prompt_versions(is_selected);
