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

const {
  formatAmount,
  formatMonth,
  formatSigned,
  getMonthlySummary,
  MonthlySummaryError,
  shiftMonth,
} = loadTypeScriptModule('../src/services/monthlySummary.ts', {
  './auth': { AuthError },
  './httpClient': {
    apiUrl: (resource) => `https://cleancheck.example/api${resource}`,
    fetchWithTimeout: (url, init, fetcher) => fetcher(url, init),
    HttpClientError,
  },
  './tasks': {},
});

function apiResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Fictitious data with the format of GET /api/my/service-entries/summary.
const summary = {
  month: '2026-12',
  totals: [
    { currency: 'EUR', entries: 2, original_total: '75.50', adjustments_total: '-5.25', total: '70.25' },
  ],
  entries: [
    {
      id: 12,
      task_id: 40,
      property_name: 'Apartamento da Foz',
      task_type: 'checkout_cleaning',
      service_date: '2026-12-10',
      amount: '45.50',
      adjustments_total: '-5.25',
      final_amount: '40.25',
      currency: 'EUR',
      adjustments: [{ amount: '-5.25', reason: 'Serviço incompleto', created_at: '2026-12-11T09:30:00+00:00' }],
    },
    {
      id: 13,
      task_id: 41,
      property_name: null,
      task_type: 'checkin_inspection',
      service_date: '2026-12-31',
      amount: '30.00',
      adjustments_total: '0.00',
      final_amount: '30.00',
      currency: 'EUR',
      adjustments: [],
    },
  ],
};

test('requests only the own summary: the URL carries the month and no provider id', async () => {
  let request;
  const result = await getMonthlySummary(async (url, init) => {
    request = { url, init };
    return apiResponse(200, { data: summary });
  }, '2026-12');

  assert.equal(request.url, 'https://cleancheck.example/api/my/service-entries/summary?month=2026-12');
  assert.equal(request.init.method, undefined);
  assert.equal(request.init.body, undefined);
  assert.doesNotMatch(request.url, /provider|user_id|service_provider_id/);
  assert.deepEqual(result, summary);
});

test('the detail adds up to the total returned by the API', async () => {
  const result = await getMonthlySummary(async () => apiResponse(200, { data: summary }), '2026-12');
  const cents = (value) => Math.round(Number(value) * 100);
  const detail = result.entries.reduce((sum, entry) => sum + cents(entry.final_amount), 0);

  assert.equal(detail, cents(result.totals[0].total));
  assert.equal(result.entries.length, result.totals[0].entries);
});

test('an empty month is a valid answer', async () => {
  const result = await getMonthlySummary(
    async () => apiResponse(200, { data: { month: '2026-11', totals: [], entries: [] } }),
    '2026-11',
  );

  assert.deepEqual(result, { month: '2026-11', totals: [], entries: [] });
});

test('a response with an unexpected format is rejected instead of shown', async () => {
  const broken = [
    null,
    { data: null },
    { data: { ...summary, totals: 'x' } },
    { data: { ...summary, entries: [{ ...summary.entries[0], final_amount: 40.25 }] } },
    { data: { ...summary, entries: [{ ...summary.entries[0], adjustments: [{ amount: '-5.25' }] }] } },
  ];

  for (const body of broken) {
    await assert.rejects(
      getMonthlySummary(async () => apiResponse(200, body), '2026-12'),
      (error) => error instanceof MonthlySummaryError && error.code === 'INVALID_RESPONSE',
    );
  }
});

test('HTTP errors map to Portuguese messages', async () => {
  const cases = [
    [403, 'FORBIDDEN', 'Só os prestadores têm resumo mensal.'],
    [404, 'NOT_AVAILABLE', 'O resumo mensal ainda não está disponível nesta versão da API.'],
    [500, 'SERVER', 'Não foi possível carregar o resumo do mês. Tenta novamente.'],
  ];

  for (const [status, code, message] of cases) {
    await assert.rejects(
      getMonthlySummary(async () => apiResponse(status, { message: 'x' }), '2026-12'),
      (error) => error instanceof MonthlySummaryError && error.code === code && error.message === message,
    );
  }
});

test('session, timeout and network failures keep their meaning', async () => {
  await assert.rejects(
    getMonthlySummary(async () => { throw new AuthError('SESSION_EXPIRED', 'x'); }, '2026-12'),
    (error) => error.code === 'SESSION_EXPIRED',
  );
  await assert.rejects(
    getMonthlySummary(async () => { throw new HttpClientError('TIMEOUT'); }, '2026-12'),
    (error) => error.code === 'TIMEOUT',
  );
  await assert.rejects(
    getMonthlySummary(async () => { throw new TypeError('Network request failed'); }, '2026-12'),
    (error) => error.code === 'NETWORK',
  );
});

test('month navigation crosses the year boundary', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-03', 0), '2026-03');
  assert.equal(formatMonth('2026-03'), 'Março de 2026');
  assert.equal(formatMonth('2026-12'), 'Dezembro de 2026');
});

test('amounts use a decimal comma and adjustments keep their sign', () => {
  assert.equal(formatAmount('40.25', 'EUR'), '40,25 €');
  assert.equal(formatAmount('0', 'EUR'), '0,00 €');
  assert.equal(formatAmount('200', 'BRL'), '200,00 BRL');
  assert.equal(formatSigned('-5.25', 'EUR'), '-5,25 €');
  assert.equal(formatSigned('2', 'EUR'), '+2,00 €');
  assert.equal(formatSigned('0', 'EUR'), '0,00 €');
});
