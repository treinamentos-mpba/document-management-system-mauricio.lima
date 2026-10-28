const assert = require('node:assert/strict');
const { mkdtemp, readdir, readFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');

const userId = randomUUID();
let server;
let baseUrl;
let storageDir;

before(async () => {
  storageDir = await mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  server = createApp({ storageDir, maxFileSizeBytes: 32 }).listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await once(server, 'close');
  await rm(storageDir, { recursive: true, force: true });
});

test('o app backend é exportado', () => {
  const app = require('../src/app');
  assert.equal(typeof app, 'function');
});

test('faz upload, lista e baixa um documento apenas para seu usuário', async () => {
  const form = new FormData();
  form.append('file', new Blob(['document contents']), 'relatorio.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': userId },
    body: form,
  });
  assert.equal(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.match(document.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(document.originalName, 'relatorio.txt');
  assert.equal(document.size, 17);
  assert.equal(document.owner, userId);
  assert.equal('storageName' in document, false);

  const storedFiles = await readdir(storageDir);
  assert.equal(storedFiles.length, 1);
  assert.notEqual(storedFiles[0], document.originalName);
  assert.equal(await readFile(path.join(storageDir, storedFiles[0]), 'utf8'), 'document contents');

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': userId },
  });
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': userId },
  });
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /relatorio\.txt/);
  assert.equal(await downloadResponse.text(), 'document contents');

  const otherUserResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': randomUUID() },
  });
  assert.equal(otherUserResponse.status, 404);
});

test('rejeita usuário inválido e upload sem arquivo', async () => {
  const invalidUserResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(invalidUserResponse.status, 400);
  assert.equal((await invalidUserResponse.json()).error.code, 'INVALID_USER_ID');

  const emptyUploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': userId },
  });
  assert.equal(emptyUploadResponse.status, 400);
  assert.equal((await emptyUploadResponse.json()).error.code, 'FILE_REQUIRED');
});

test('rejeita arquivos acima do limite configurado', async () => {
  const form = new FormData();
  form.append('file', new Blob(['conteudo maior que o limite configurado de trinta e dois bytes']), 'grande.txt');

  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': userId },
    body: form,
  });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'FILE_TOO_LARGE');
});
