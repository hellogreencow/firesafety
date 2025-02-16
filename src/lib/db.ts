import { Database } from 'sql.js';
import { isElectron, getElectron } from '../utils/electron';
import { initialTrainingData } from '../data/initialTrainingData';

let db: Database | null = null;
let initPromise: Promise<void> | null = null;

const saveToStorage = async (data: Uint8Array) => {
  if (isElectron()) {
    const { ipcRenderer } = getElectron();
    if (ipcRenderer) {
      await ipcRenderer.invoke('save-database', data);
    }
  } else {
    try {
      localStorage.setItem('database', JSON.stringify(Array.from(data)));
    } catch (error) {
      console.warn('Could not save database to localStorage:', error);
    }
  }
};

const loadFromStorage = async (): Promise<Uint8Array | null> => {
  if (isElectron()) {
    const { ipcRenderer } = getElectron();
    if (ipcRenderer) {
      return await ipcRenderer.invoke('load-database');
    }
  } else {
    try {
      const saved = localStorage.getItem('database');
      if (saved) {
        return new Uint8Array(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Could not load database from localStorage:', error);
    }
  }
  return null;
};

const seedInitialData = async () => {
  if (!db) return;

  // Check if we need to seed data
  const stmt = db.prepare('SELECT COUNT(*) as count FROM training_data');
  const [result] = stmt.get() as unknown[] || [{ count: 0 }];
  stmt.free();

  if (result && (result as any).count === 0) {
    console.log('Seeding initial training data...');
    const insertStmt = db.prepare(`
      INSERT INTO training_data (question, answer, category, confidence)
      VALUES (?, ?, ?, ?)
    `);

    initialTrainingData.forEach(data => {
      insertStmt.run([data.question, data.answer, data.category, data.confidence]);
    });

    insertStmt.free();
    
    // Save after seeding
    const dbData = db.export();
    await saveToStorage(dbData);
    console.log('Initial training data seeded successfully');
  }
};

export async function initializeDatabase() {
  if (initPromise) return initPromise;

  initPromise = new Promise(async (resolve, reject) => {
    try {
      const SQL = await import('sql.js');
      const initSqlJs = SQL.default;

      const sqlWasm = await initSqlJs({
        locateFile: file => {
          if (process.env.NODE_ENV === 'development') {
            return `https://sql.js.org/dist/${file}`;
          }
          return isElectron() ? `wasm://sql-wasm.wasm` : `/sql-wasm.wasm`;
        }
      });

      try {
        const savedData = await loadFromStorage();
        if (savedData) {
          db = new sqlWasm.Database(savedData);
        } else {
          db = new sqlWasm.Database();
        }
      } catch (error) {
        console.warn('Could not load saved database, creating new one:', error);
        db = new sqlWasm.Database();
      }

      // Training data table
      db.run(`
        CREATE TABLE IF NOT EXISTS training_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          category TEXT,
          source TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          confidence FLOAT DEFAULT 1.0,
          times_used INTEGER DEFAULT 0
        )
      `);

      // Chat history table
      db.run(`
        CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          training_data_id INTEGER,
          FOREIGN KEY(training_data_id) REFERENCES training_data(id)
        )
      `);

      // Create indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_training_data_category ON training_data(category)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id)`);

      // Seed initial data if needed
      await seedInitialData();

      resolve();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      reject(error);
    }
  });

  return initPromise;
}

export async function getRelevantTrainingData(query: string): Promise<TrainingData[]> {
  if (!db) return [];

  const words = query.toLowerCase()
    .split(' ')
    .filter(word => word.length > 3)
    .map(word => `%${word}%`);
  
  if (words.length === 0) return [];

  const placeholders = words.map(() => '(LOWER(question) LIKE ? OR LOWER(answer) LIKE ?)').join(' OR ');
  const values = words.flatMap(word => [word, word]);

  const stmt = db.prepare(`
    SELECT id, question, answer, category, source, confidence, times_used, created_at,
           COUNT(*) as match_count
    FROM training_data
    WHERE ${placeholders}
    GROUP BY id
    ORDER BY match_count DESC, confidence DESC, times_used DESC
    LIMIT 3
  `);
  
  const results = stmt.get(values);
  stmt.free();
  
  // Convert SQL.js results to TrainingData type
  return (results as any[]).map(row => ({
    id: row.id as number,
    question: row.question as string,
    answer: row.answer as string,
    category: row.category as string | undefined,
    source: row.source as string | undefined,
    confidence: row.confidence as number,
    times_used: row.times_used as number,
    created_at: row.created_at as string
  }));
}

export async function logChatHistory(data: {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  trainingDataId?: number;
}) {
  if (!db) return;

  const stmt = db.prepare(`
    INSERT INTO chat_history (session_id, role, content, training_data_id)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run([data.sessionId, data.role, data.content, data.trainingDataId || null]);
  stmt.free();

  // Save database after changes
  const dbData = db.export();
  await saveToStorage(dbData);
}

export async function updateTrainingDataUsage(id: number) {
  if (!db) return;

  const stmt = db.prepare(`
    UPDATE training_data
    SET times_used = times_used + 1
    WHERE id = ?
  `);
  
  stmt.run([id]);
  stmt.free();

  // Save database after changes
  const dbData = db.export();
  await saveToStorage(dbData);
}

export type TrainingData = {
  id: number;
  question: string;
  answer: string;
  category?: string;
  source?: string;
  confidence: number;
  times_used: number;
  created_at: string;
};