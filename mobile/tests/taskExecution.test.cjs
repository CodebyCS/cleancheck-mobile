const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

class AuthError extends Error { constructor(code, message) { super(message); this.code = code; } }
class HttpClientError extends Error { constructor(code) { super(code); this.code = code; } }

function loadTypeScriptModule(relativePath, mocks) {
  const filename = path.resolve(__dirname, relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename === filename && Object.hasOwn(mocks, request)) return mocks[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  try { loaded._compile(output, filename); } finally { Module._load = originalLoad; }
  return loaded.exports;
}

let nextStatus = 201;
let nextPayload;
let fetchError;
let lastRequest;
const api = loadTypeScriptModule('../src/services/tasks.ts', {
  './auth': { AuthError },
  './httpClient': {
    apiUrl: (resource) => `https://cleancheck.example/api${resource}`,
    fetchWithTimeout: (url, init, fetcher) => {
      lastRequest = { url, init };
      if (fetchError) return Promise.reject(fetchError);
      return fetcher(url, init);
    },
    HttpClientError,
  },
  'expo-file-system': { File: class File {} },
});

const baseSubmission = {
  idempotency_key: '2c9a7732-35f1-4ad2-a0bc-f2c960c78908',
  responses: [{ key: 'Limpeza', value: true }],
  observations: 'Tudo concluído.',
  evidence_ids: [77],
};
const record = {
  id: 18, task_id: 5, user_id: 7, ...baseSubmission,
  send_state: 'confirmed', confirmed_at: '2026-11-27T12:00:00Z',
};
const checklist = {
  task_id: 5,
  checklist_template_id: 12,
  name: 'Limpeza de saída',
  version: 3,
  required_total: 1,
  required_done: 0,
  completed: false,
  items: [{ id: 31, position: 1, label: 'Verificar cozinha', required: true, done: false, done_at: null, done_by: null }],
};

test('carrega checklist versionada da tarefa e permite ausência de template', async () => {
  nextPayload = { data: checklist };
  nextStatus = 200;
  const result = await api.getMyTaskChecklist(5, async () => new Response(JSON.stringify(nextPayload), { status: nextStatus }));
  assert.deepEqual(result, checklist);
  assert.equal(lastRequest.url, 'https://cleancheck.example/api/my/tasks/5/checklist');
  assert.equal(lastRequest.init.headers.Accept, 'application/json');

  const empty = await api.getMyTaskChecklist(5, async () => new Response(JSON.stringify({ data: null }), { status: 200 }));
  assert.equal(empty, null);
});

test('marca item pela API com done e usa a resposta atualizada', async () => {
  nextPayload = { data: { ...checklist, required_done: 1, completed: true, items: [{ ...checklist.items[0], done: true, done_at: '2026-11-27T12:00:00Z', done_by: { id: 7, name: 'Prestador' } }] } };
  nextStatus = 200;
  const result = await api.markMyTaskChecklistItem(5, 31, true, async () => new Response(JSON.stringify(nextPayload), { status: nextStatus }));
  assert.equal(lastRequest.url, 'https://cleancheck.example/api/my/tasks/5/checklist/items/31');
  assert.equal(lastRequest.init.method, 'PATCH');
  assert.deepEqual(JSON.parse(lastRequest.init.body), { done: true });
  assert.equal(result.items[0].done, true);
  assert.equal(result.required_done, 1);
});

test('403, 404 e 422 da checklist são erros explícitos', async () => {
  await assert.rejects(api.getMyTaskChecklist(5, async () => new Response(JSON.stringify({ message: 'Sem acesso.' }), { status: 403 })), (error) => error.code === 'FORBIDDEN');
  await assert.rejects(api.getMyTaskChecklist(5, async () => new Response(JSON.stringify({ message: 'Não encontrado.' }), { status: 404 })), (error) => error.code === 'NOT_FOUND');
  await assert.rejects(api.markMyTaskChecklistItem(5, 31, true, async () => new Response(JSON.stringify({ message: 'Tarefa fora de curso.' }), { status: 422 })), (error) => error.code === 'VALIDATION' && error.message === 'Tarefa fora de curso.');
});

test('submete execução autenticada e aceita confirmação 201', async () => {
  nextStatus = 201;
  nextPayload = { data: record };
  fetchError = null;
  const result = await api.submitMyTaskExecution(5, baseSubmission, async () => new Response(JSON.stringify(nextPayload), { status: nextStatus }));
  assert.equal(result.record.id, 18);
  assert.equal(result.repeated, false);
  assert.equal(lastRequest.url, 'https://cleancheck.example/api/my/tasks/5/executions');
  assert.equal(lastRequest.init.method, 'POST');
  assert.deepEqual(JSON.parse(lastRequest.init.body), baseSubmission);
});

test('retry idêntico aceita 200 e preserva o mesmo ID', async () => {
  nextStatus = 200;
  nextPayload = { data: record };
  const result = await api.submitMyTaskExecution(5, baseSubmission, async () => new Response(JSON.stringify(nextPayload), { status: nextStatus }));
  assert.equal(result.record.id, 18);
  assert.equal(result.repeated, true);
  assert.equal(JSON.parse(lastRequest.init.body).idempotency_key, baseSubmission.idempotency_key);
});

test('conflito 409 não é comunicado como sucesso', async () => {
  const result = api.submitMyTaskExecution(5, baseSubmission, async () => new Response(JSON.stringify({ message: 'Conteúdo diferente.' }), { status: 409 }));
  await assert.rejects(result, (error) => error.code === 'CONFLICT' && error.message === 'Conteúdo diferente.');
});

test('401 encaminha sessão expirada e não confirma execução', async () => {
  await assert.rejects(
    api.submitMyTaskExecution(5, baseSubmission, async () => new Response(JSON.stringify({ message: 'Unauthenticated.' }), { status: 401 })),
    (error) => error.code === 'SESSION_EXPIRED',
  );
});

test('422 é uma rejeição definitiva de execução, não um sucesso', async () => {
  await assert.rejects(
    api.submitMyTaskExecution(5, baseSubmission, async () => new Response(JSON.stringify({ message: 'Dados inválidos.' }), { status: 422 })),
    (error) => error.code === 'VALIDATION' && error.message === 'Dados inválidos.',
  );
});

test('vistoria de saída usa endpoint separado e confirma resposta 201', async () => {
  const checkoutRecord = { ...record, responses: [], observations: null, evidence_ids: [88], recorded_at: '2026-11-27T13:00:00Z' };
  const result = await api.submitMyTaskCheckoutInspection(5, { ...baseSubmission, responses: [], observations: null, evidence_ids: [88] }, async () => new Response(JSON.stringify({ data: checkoutRecord }), { status: 201 }));
  assert.equal(result.record.id, 18);
  assert.equal(result.repeated, false);
  assert.equal(lastRequest.url, 'https://cleancheck.example/api/my/tasks/5/checkout-inspection');
  assert.deepEqual(JSON.parse(lastRequest.init.body).evidence_ids, [88]);
});

test('valida tipos, tamanho e duração nos limites mobile acordados', () => {
  const { validateTaskEvidenceMetadata } = api;
  assert.equal(validateTaskEvidenceMetadata('photo', 'image/jpeg', 10 * 1024 * 1024, null), null);
  assert.match(validateTaskEvidenceMetadata('photo', 'image/jpeg', 10 * 1024 * 1024 + 1, null), /10 MB/);
  assert.equal(validateTaskEvidenceMetadata('video', 'video/quicktime', 50 * 1024 * 1024, 60_000), null);
  assert.match(validateTaskEvidenceMetadata('video', 'video/mp4', 50 * 1024 * 1024 + 1, 1000), /50 MB/);
  assert.match(validateTaskEvidenceMetadata('video', 'video/avi', 1000, 1000), /Formato não aceite/);
  assert.match(validateTaskEvidenceMetadata('video', 'video/mp4', 1000, 60_001), /60 segundos/);
});

test('upload só confirma um ficheiro com metadados devolvidos pela API', async () => {
  const OriginalFormData = global.FormData;
  class FormDataMock { constructor() { this.entries = []; } append(...args) { this.entries.push(args); } }
  global.FormData = FormDataMock;
  try {
    const result = await api.uploadMyTaskEvidence(5, { uri: 'file:///tmp/room.jpg', fileName: 'room.jpg', mimeType: 'image/jpeg' }, async (url, init) => {
      lastRequest = { url, init };
      return new Response(JSON.stringify({ data: { id: 77, kind: 'photo', mime_type: 'image/jpeg', size_bytes: 1024 } }), { status: 201 });
    });
    assert.equal(result.id, 77);
    assert.equal(lastRequest.url, 'https://cleancheck.example/api/my/tasks/5/evidence');
    assert.equal(lastRequest.init.body.entries[0][0], 'file');
  } finally {
    global.FormData = OriginalFormData;
  }
});

test('upload 422 mostra erro do campo e não confirma o ficheiro', async () => {
  const OriginalFormData = global.FormData;
  global.FormData = class { append() {} };
  try {
    await assert.rejects(
      api.uploadMyTaskEvidence(5, { uri: 'file:///tmp/room.jpg', fileName: 'room.jpg', mimeType: 'image/jpeg' }, async () => new Response(JSON.stringify({ errors: { file: ['Formato não aceite.'] } }), { status: 422 })),
      /Formato não aceite/,
    );
  } finally {
    global.FormData = OriginalFormData;
  }
});

test('falha de rede fica como resultado desconhecido', async () => {
  fetchError = new Error('offline');
  await assert.rejects(
    api.submitMyTaskExecution(5, baseSubmission, async () => { throw new Error('unused'); }),
    (error) => error.code === 'NETWORK' && error.message.includes('chave'),
  );
  fetchError = null;
});

const secureItems = new Map();
const secureStore = {
  getItemAsync: async (key) => secureItems.get(key) ?? null,
  setItemAsync: async (key, value) => {
    if (Buffer.byteLength(value, 'utf8') > 2048) throw new RangeError('Secure value too large');
    secureItems.set(key, value);
  },
  deleteItemAsync: async (key) => { secureItems.delete(key); },
};
const pendingStore = loadTypeScriptModule('../src/services/pendingTaskExecutions.ts', { 'expo-secure-store': secureStore });

test('falha ao consultar confirmação remota mantém payload e chave locais para retry', async () => {
  secureItems.clear();
  const pending = { taskId: 5, userId: 7, kind: 'execution', submission: baseSubmission };
  await pendingStore.savePendingTaskExecution(pending);
  const restored = await pendingStore.getPendingTaskExecution(5, 7, 'execution');

  const result = await pendingStore.reconcilePendingTaskExecution(
    restored,
    async () => { throw new Error('offline'); },
    (confirmed) => confirmed.idempotency_key,
  );

  assert.equal(result.error.message, 'offline');
  assert.deepEqual(result.pending, pending);
  assert.equal(result.pending.submission.idempotency_key, baseSubmission.idempotency_key);
  assert.deepEqual(await pendingStore.getPendingTaskExecution(5, 7, 'execution'), pending);
});

test('só liberta o envio pendente quando a API confirma a mesma chave', async () => {
  const pending = { taskId: 5, userId: 7, kind: 'execution', submission: baseSubmission };
  const confirmed = { ...record };
  const matching = await pendingStore.reconcilePendingTaskExecution(
    pending,
    async () => confirmed,
    (value) => value.idempotency_key,
  );
  assert.equal(matching.pending, undefined);
  assert.equal(matching.confirmed, confirmed);

  const different = await pendingStore.reconcilePendingTaskExecution(
    pending,
    async () => ({ ...confirmed, idempotency_key: 'different-key' }),
    (value) => value.idempotency_key,
  );
  assert.deepEqual(different.pending, pending);
});

test('guarda/restaura envio pendente sem alterar chave nem payload e bloqueia novo envio', async () => {
  secureItems.clear();
  const pending = { taskId: 5, userId: 7, kind: 'execution', submission: baseSubmission };
  await pendingStore.savePendingTaskExecution(pending);
  assert.deepEqual(await pendingStore.getPendingTaskExecution(5, 7, 'execution'), pending);
  await assert.rejects(pendingStore.savePendingTaskExecution(pending), /envio por confirmar/);
  await pendingStore.removePendingTaskExecution(5, 7, 'execution');
  assert.equal(await pendingStore.getPendingTaskExecution(5, 7, 'execution'), null);
});

test('limpa pendentes no logout e preserva outros utilizadores antes da limpeza explícita', async () => {
  secureItems.clear();
  await pendingStore.savePendingTaskExecution({ taskId: 5, userId: 7, kind: 'execution', submission: baseSubmission });
  await pendingStore.savePendingTaskExecution({ taskId: 8, userId: 9, kind: 'checkout-inspection', submission: { ...baseSubmission, idempotency_key: '5abc7732-35f1-4ad2-a0bc-f2c960c78908' } });
  assert.ok(await pendingStore.getPendingTaskExecution(8, 9, 'checkout-inspection'));
  await pendingStore.clearPendingTaskExecutions();
  assert.equal(await pendingStore.getPendingTaskExecution(5, 7, 'execution'), null);
  assert.equal(await pendingStore.getPendingTaskExecution(8, 9, 'checkout-inspection'), null);
});
