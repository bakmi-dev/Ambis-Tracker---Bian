import { query } from '../config/db';

export const initDb = async () => {
  try {
    console.log('[DB Init] Checking and initializing tables...');

    // 1. Create Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash TEXT,
        avatar_url TEXT,
        role_track VARCHAR(100),
        workspace_name VARCHAR(255),
        focus_target_hours INT DEFAULT 4,
        is_onboarded BOOLEAN DEFAULT FALSE,
        xp INT DEFAULT 0,
        current_streak INT DEFAULT 0,
        profile_metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate existing users table: add new columns if they don't exist
    const migrationCols = [
      { col: 'google_id', def: "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE" },
      { col: 'avatar_url', def: "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT" },
      { col: 'role_track', def: "ALTER TABLE users ADD COLUMN IF NOT EXISTS role_track VARCHAR(100)" },
      { col: 'workspace_name', def: "ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_name VARCHAR(255)" },
      { col: 'focus_target_hours', def: "ALTER TABLE users ADD COLUMN IF NOT EXISTS focus_target_hours INT DEFAULT 4" },
      { col: 'is_onboarded', def: "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE" },
    ];
    for (const m of migrationCols) {
      await query(m.def);
    }
    // Make password_hash nullable for Google OAuth users
    await query("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL");

    // Ensure users.id has a default uuid generator if not already set
    try {
      await query("ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()");
    } catch (e) {
      // Non-fatal if DB uses text id or extension differs
    }

    // Ensure created_at and updated_at have DEFAULT CURRENT_TIMESTAMP
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    try {
      await query("ALTER TABLE users ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP");
    } catch (e) {}

    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    try {
      await query("ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP");
    } catch (e) {}

    // 2. Create Tasks Table (with foreign key to users)
    await query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(50) DEFAULT 'medium',
        scheduled_date TIMESTAMP,
        is_completed BOOLEAN DEFAULT FALSE,
        category VARCHAR(100),
        tags TEXT[],
        xp INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. Create StudySessions Table
    await query(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_minutes INT NOT NULL,
        session_type VARCHAR(50) DEFAULT 'sprint',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 4. Create Goals Table
    await query(`
      CREATE TABLE IF NOT EXISTS goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        deadline TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        progress_percentage INT DEFAULT 0,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 5. Create Projects Table
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        deadline TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        progress INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // 6. Create Project Tasks
    await query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'todo',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 7. Create Journal Entries Table
    await query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        entry_date TIMESTAMP NOT NULL,
        content TEXT NOT NULL,
        emotion_tag VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 8. Create Knowledge Docs Table
    await query(`
      CREATE TABLE IF NOT EXISTS knowledge_docs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT DEFAULT '',
        category VARCHAR(100),
        is_pinned BOOLEAN DEFAULT FALSE,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // 9. Create Competitions Table
    await query(`
      CREATE TABLE IF NOT EXISTS competitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        organizer VARCHAR(255),
        type VARCHAR(100),
        deadline TIMESTAMP,
        status VARCHAR(50) DEFAULT 'preparation',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 10. Create Learning Materials Table
    await query(`
      CREATE TABLE IF NOT EXISTS learning_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        url TEXT,
        status VARCHAR(50) DEFAULT 'not_started',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('[DB Init] All tables initialized successfully.');
  } catch (error) {
    console.error('[DB Init] Failed to initialize tables:', error);
  }
};
