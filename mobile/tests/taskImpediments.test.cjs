const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

class HttpClientError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function loadTypeScriptModule(relativePath, mocks) {
  const filename = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename === filename && Object.hasOwn(mocks, request)) return mocks[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    loaded._compile(output, filename);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

const { registerTaskImpediment, TaskImpedimentError } = loadTypeScriptModule(
  '../src/services/taskImpediments.ts',
  {
    './auth': { AuthError },
    './httpClient': {
      apiUrl: (resource) => `https://cleancheck.example/api${resource}`,
      fetchWithTimeout: (url, init, fetcher) => fetcher(url, init),
      HttpClientError,
    },
  },
);

const secureItems = new Map();
const secureStoreMock = {
  getItemAsync: async (key) => secureItems.get(key) ?? null,
  setItemAsync: async (key, value) => {
    if (Buffer.byteLength(value, 'utf8') > 2048) throw new RangeError('Secure value too large');
    secureItems.set(key, value);
  },
  deleteItemAsync: async (key) => { secureItems.delete(key); },
};
const {
  clearPendingTaskImpediments,
  getPendingTaskImpediment,
  removePendingTaskImpediment,
  savePendingTaskImpediment,
} = loadTypeScriptModule('../src/services/pendingTaskImpediments.ts', {
  'expo-secure-store': secureStoreMock,
});

function apiResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const submission = {
  reason: 'Equipamento avariado',
  description: 'O aspirador deixou de funcionar.',
  idempotency_key: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
};

const record = {
  id: 12,
  task_id: 7,
  user_id: 3,
  reason: submission.reason,
  description: submission.description,
  created_at: '2026-11-04T12:00:00.000000Z',
};

test('POST sends the agreed payload and accepts a new 201 response', async () => {
  let request;
  const result = await registerTaskImpediment(7, submission, async (url, init) => {
    request = { url, init };
    return apiResponse(201, record);
  });

  assert.equal(request.url, 'https://cleancheck.example/api/tasks/7/impediments');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.init.body), submission);
  assert.deepEqual(result, { record, repeated: false });
});

test('an identical retry accepts 200 as an already registered impediment', async () => {
  const result = await registerTaskImpediment(7, submission, async () => apiResponse(200, record));
  assert.deepEqual(result, { record, repeated: true });
});

test('422 maps server validation messages by field', async () => {
  await assert.rejects(
    registerTaskImpediment(7, submission, async () => apiResponse(422, {
      message: 'The reason field is required.',
      errors: { reason: ['Indica o motivo.'], description: ['Texto demasiado longo.'] },
    })),
    (error) => error instanceof TaskImpedimentError
      && error.code === 'VALIDATION'
      && error.fieldErrors.reason === 'Indica o motivo.'
      && error.fieldErrors.description === 'Texto demasiado longo.',
  );
});

test('403, 404 and 409 return actionable error codes', async (t) => {
  for (const [status, code] of [[403, 'FORBIDDEN'], [404, 'NOT_FOUND'], [409, 'CONFLICT']]) {
    await t.test(`${status} maps to ${code}`, async () => {
      await assert.rejects(
        registerTaskImpediment(7, submission, async () => apiResponse(status, { message: `error ${status}` })),
        (error) => error instanceof TaskImpedimentError && error.code === code && error.message === `error ${status}`,
      );
    });
  }
});

test('401 and an expired authenticated session use the existing session error', async (t) => {
  await t.test('401 response', async () => {
    await assert.rejects(
      registerTaskImpediment(7, submission, async () => apiResponse(401, { message: 'Unauthenticated.' })),
      (error) => error instanceof TaskImpedimentError && error.code === 'SESSION_EXPIRED',
    );
  });
  await t.test('AuthError from authenticatedFetch', async () => {
    await assert.rejects(
      registerTaskImpediment(7, submission, async () => { throw new AuthError('SESSION_EXPIRED', 'Session expired'); }),
      (error) => error instanceof TaskImpedimentError && error.code === 'SESSION_EXPIRED',
    );
  });
});

test('authenticated 401 clears the stored session and pending impediments', async () => {
  secureItems.clear();
  await savePendingTaskImpediment({ taskId: 7, userId: 3, submission });

  const session = {
    token: 'test-token',
    user: { id: 3, name: 'Prestador Teste', email: 'prestador@example.test', role: 'service_provider' },
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  let currentSession = session;
  let removeSessionCalls = 0;
  let stateIndex = 0;
  const reactMock = {
    createContext: () => ({ Provider: 'AuthContext.Provider' }),
    createElement: (type, props, children) => ({ type, props: { ...props, children } }),
    useState: (initialValue) => {
      stateIndex += 1;
      return stateIndex === 1
        ? [currentSession, (next) => { currentSession = typeof next === 'function' ? next(currentSession) : next; }]
        : [initialValue, () => {}];
    },
    useEffect: () => {},
    useCallback: (callback) => callback,
    useContext: () => null,
    useMemo: (factory) => factory(),
  };
  const { AuthProvider } = loadTypeScriptModule('../src/auth/AuthContext.tsx', {
    react: reactMock,
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    'react-native': { Alert: { alert: () => {} } },
    '../services/auth': { AuthError, getCurrentUser: async () => session.user, login: async () => ({}), logout: async () => {} },
    '../services/authTokenStorage': {
      readAuthSession: async () => session,
      removeAuthSession: async () => { removeSessionCalls += 1; },
      saveAuthSession: async () => {},
    },
    '../services/pendingTaskImpediments': { clearPendingTaskImpediments },
  });
  const provider = AuthProvider({ children: null });
  const { authenticatedFetch } = provider.props.value;
  const originalFetch = global.fetch;
  global.fetch = async () => apiResponse(401, { message: 'Unauthenticated.' });
  try {
    await assert.rejects(authenticatedFetch('https://cleancheck.example/api/tasks/7/impediments'));
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(removeSessionCalls, 1);
  assert.equal(currentSession, null);
  assert.equal(await getPendingTaskImpediment(7, 3), null);
});

test('network retry reuses the identical body and idempotency key', async () => {
  const sentBodies = [];
  let attempts = 0;
  const fetcher = async (_url, init) => {
    sentBodies.push(JSON.parse(init.body));
    attempts += 1;
    if (attempts === 1) throw new TypeError('Network request failed');
    return apiResponse(200, record);
  };

  await assert.rejects(
    registerTaskImpediment(7, submission, fetcher),
    (error) => error instanceof TaskImpedimentError && error.code === 'NETWORK',
  );
  const retry = await registerTaskImpediment(7, submission, fetcher);

  assert.equal(retry.repeated, true);
  assert.deepEqual(sentBodies, [submission, submission]);
  assert.equal(sentBodies[0].idempotency_key, sentBodies[1].idempotency_key);
});

test('an unresolved operation blocks another task for the same user but not another user', async () => {
  secureItems.clear();
  const first = { taskId: 7, userId: 3, submission };
  const second = {
    taskId: 8,
    userId: 3,
    submission: { ...submission, idempotency_key: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
  };
  const otherUser = { ...second, userId: 4 };

  await savePendingTaskImpediment(first);
  await assert.rejects(savePendingTaskImpediment(second), /pending impediment already exists for task 7/i);
  assert.deepEqual(await getPendingTaskImpediment(7, '3'), first);
  await savePendingTaskImpediment(otherUser);
  assert.equal(await getPendingTaskImpediment(8, 3), null);
  assert.deepEqual(await getPendingTaskImpediment(8, 4), otherUser);
  await removePendingTaskImpediment(7, 3);
  assert.deepEqual(await getPendingTaskImpediment(8, 4), otherUser);
  await clearPendingTaskImpediments();
  assert.equal(await getPendingTaskImpediment(8, 4), null);
});

test('ambiguous network failure preserves the stored payload and success clears it after an identical retry', async () => {
  secureItems.clear();
  const draft = { taskId: 7, userId: 3, submission };
  await savePendingTaskImpediment(draft);

  const sentBodies = [];
  let attempts = 0;
  const fetcher = async (_url, init) => {
    sentBodies.push(JSON.parse(init.body));
    attempts += 1;
    if (attempts === 1) throw new TypeError('Network request failed');
    return apiResponse(200, record);
  };

  await assert.rejects(
    registerTaskImpediment(7, (await getPendingTaskImpediment(7, 3)).submission, fetcher),
    (error) => error instanceof TaskImpedimentError && error.code === 'NETWORK',
  );
  assert.deepEqual(await getPendingTaskImpediment(7, 3), draft);

  const retry = await registerTaskImpediment(7, (await getPendingTaskImpediment(7, 3)).submission, fetcher);
  assert.equal(retry.repeated, true);
  assert.deepEqual(sentBodies, [submission, submission]);
  await removePendingTaskImpediment(7, 3);
  assert.equal(await getPendingTaskImpediment(7, 3), null);

  const newSubmission = { ...submission, idempotency_key: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' };
  await savePendingTaskImpediment({ taskId: 7, userId: 3, submission: newSubmission });
  assert.deepEqual((await getPendingTaskImpediment(7, 3)).submission, newSubmission);
});

test('a maximum-length multibyte description is stored in bounded secure chunks', async () => {
  secureItems.clear();
  const draft = {
    taskId: 7,
    userId: 3,
    submission: {
      ...submission,
      description: 'ñ'.repeat(2000),
      idempotency_key: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    },
  };

  await savePendingTaskImpediment(draft);
  assert.deepEqual(await getPendingTaskImpediment(7, 3), draft);
  assert.ok([...secureItems.values()].every((value) => Buffer.byteLength(value, 'utf8') <= 2048));
});

test('idempotency keys are UUID v4 values', () => {
  const { createIdempotencyKey } = loadTypeScriptModule('../src/services/taskImpediments.ts', {
    './auth': { AuthError },
    './httpClient': {
      apiUrl: (resource) => `https://cleancheck.example/api${resource}`,
      fetchWithTimeout: (url, init, fetcher) => fetcher(url, init),
      HttpClientError,
    },
  });
  assert.match(createIdempotencyKey(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('timeout remains retryable instead of being treated as a definitive rejection', async () => {
  const { registerTaskImpediment: registerWithTimeout } = loadTypeScriptModule(
    '../src/services/taskImpediments.ts',
    {
      './auth': { AuthError },
      './httpClient': {
        apiUrl: (resource) => `https://cleancheck.example/api${resource}`,
        fetchWithTimeout: async () => { throw new HttpClientError('TIMEOUT'); },
        HttpClientError,
      },
    },
  );

  secureItems.clear();
  const draft = { taskId: 7, userId: 3, submission };
  await savePendingTaskImpediment(draft);
  await assert.rejects(
    registerWithTimeout(7, (await getPendingTaskImpediment(7, 3)).submission, async () => apiResponse(201, record)),
    (error) => error.name === 'TaskImpedimentError' && error.code === 'NETWORK' && error.message.includes('tenta novamente'),
  );
  assert.deepEqual(await getPendingTaskImpediment(7, 3), draft);
});
