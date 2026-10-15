export interface DbUser {
  id: string;
  username: string;
  createdAt: string;
}

export interface DbTodo {
  id: string;
  title: string;
  assigneeId: string;
  completed: boolean;
  createdAt: string;
}

interface DbSchema {
  users: DbUser[];
  todos: DbTodo[];
}

/**
 * Error carrying an HTTP-like status, so the UI can say "(500 Error)" accurately
 * instead of guessing from the message text.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Options accepted by READ operations. Reads can never be forced to fail. */
export interface ReadOptions {
  latency?: number;
}

/** Options accepted by MUTATIONS. Only mutations can be forced to fail by the simulator. */
export interface MutationOptions extends ReadOptions {
  simulateError?: boolean;
}

const STORAGE_KEY = 'jtl_monorepo_mock_db_v1';

const INITIAL_DATA: DbSchema = {
  users: [
    {
      id: 'usr-1',
      username: 'ada_lovelace',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      id: 'usr-2',
      username: 'alan_turing',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      id: 'usr-3',
      username: 'grace_hopper',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    },
  ],
  todos: [
    {
      id: 'todo-1',
      title: 'Design analytical engine algorithms',
      assigneeId: 'usr-1',
      completed: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: 'todo-2',
      title: 'Publish first computer program notes',
      assigneeId: 'usr-1',
      completed: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: 'todo-3',
      title: 'Break enigma machine cipher keys',
      assigneeId: 'usr-2',
      completed: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    },
    {
      id: 'todo-4',
      title: 'Implement first compiler specification',
      assigneeId: 'usr-3',
      completed: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
  ],
};

function loadDb(): DbSchema {
  if (typeof window === 'undefined') return INITIAL_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      return INITIAL_DATA;
    }
    return JSON.parse(raw) as DbSchema;
  } catch {
    return INITIAL_DATA;
  }
}

function saveDb(data: DbSchema): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

async function simulateLatency(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockDatabase {
  /**
   * The "Simulate API Error" switch is deliberately scoped to MUTATIONS only.
   * If reads could fail too, the `onSettled` refetch that follows a failed mutation would
   * fail as well, cascading into a broken list. The read methods below therefore accept
   * `ReadOptions` (no `simulateError`), which makes that mistake a compile-time error.
   */
  private static failIfSimulated(simulateError: boolean | undefined): void {
    if (simulateError) {
      throw new ApiError('Simulated network error (500 Internal Server Error) — operation failed.', 500);
    }
  }

  // --- Users API (reads) ---
  static async getUsers(options: ReadOptions = {}): Promise<DbUser[]> {
    await simulateLatency(options.latency);
    const db = loadDb();
    return [...db.users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getUserById(id: string, options: ReadOptions = {}): Promise<DbUser | null> {
    await simulateLatency(options.latency);
    const db = loadDb();
    const user = db.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  // --- Users API (mutations) ---
  static async createUser(username: string, options: MutationOptions = {}): Promise<DbUser> {
    await simulateLatency(options.latency);
    this.failIfSimulated(options.simulateError);
    const db = loadDb();

    // Check duplicate
    const normalized = username.trim().toLowerCase();
    const existing = db.users.find((u) => u.username.toLowerCase() === normalized);
    if (existing) {
      throw new ApiError(`Username "${username}" is already taken.`, 409);
    }

    const newUser: DbUser = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      username: username.trim(),
      createdAt: new Date().toISOString(),
    };

    db.users.unshift(newUser);
    saveDb(db);
    return newUser;
  }

  // --- ToDos API (reads) ---
  static async getTodos(userId?: string, options: ReadOptions = {}): Promise<DbTodo[]> {
    await simulateLatency(options.latency);
    const db = loadDb();
    let items = db.todos;
    if (userId) {
      items = items.filter((t) => t.assigneeId === userId);
    }
    return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- ToDos API (mutations) ---
  static async createTodo(
    input: { title: string; assigneeId: string },
    options: MutationOptions = {}
  ): Promise<DbTodo> {
    await simulateLatency(options.latency);
    this.failIfSimulated(options.simulateError);
    const db = loadDb();

    // Ensure assignee exists
    const user = db.users.find((u) => u.id === input.assigneeId);
    if (!user) {
      throw new ApiError(`Assignee with ID "${input.assigneeId}" does not exist.`, 404);
    }

    const newTodo: DbTodo = {
      id: `todo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: input.title.trim(),
      assigneeId: input.assigneeId,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    db.todos.push(newTodo);
    saveDb(db);
    return newTodo;
  }

  static async toggleTodo(id: string, options: MutationOptions = {}): Promise<DbTodo> {
    await simulateLatency(options.latency);
    this.failIfSimulated(options.simulateError);
    const db = loadDb();
    const todo = db.todos.find((t) => t.id === id);
    if (!todo) {
      throw new ApiError(`Todo with ID "${id}" not found.`, 404);
    }
    todo.completed = !todo.completed;
    saveDb(db);
    return { ...todo };
  }

  static resetDatabase(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    }
  }
}
