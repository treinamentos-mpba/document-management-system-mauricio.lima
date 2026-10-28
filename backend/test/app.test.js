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

test('lista apenas documentos do usuário informado', async () => {
  const firstUser = randomUUID();
  const secondUser = randomUUID();
  const form = new FormData();
  form.append('file', new Blob(['documento privado']), 'privado.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': firstUser },
    body: form,
  });
  assert.equal(uploadResponse.status, 201);
  const document = await uploadResponse.json();

  const firstList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': firstUser },
  });
  assert.equal(firstList.status, 200);
  assert.deepEqual(await firstList.json(), [document]);

  const secondList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': secondUser },
  });
  assert.equal(secondList.status, 200);
  assert.deepEqual(await secondList.json(), []);

  const secondDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': secondUser },
  });
  assert.equal(secondDownload.status, 404);
  assert.equal((await secondDownload.json()).error.code, 'DOCUMENT_NOT_FOUND');
});

test('valida o identificador do documento e trata documentos inexistentes', async () => {
  const invalidResponse = await fetch(`${baseUrl}/documents/id-invalido/download`, {
    headers: { 'X-User-Id': userId },
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal((await invalidResponse.json()).error.code, 'INVALID_DOCUMENT_ID');

  const missingResponse = await fetch(`${baseUrl}/documents/${randomUUID()}/download`, {
    headers: { 'X-User-Id': userId },
  });
  assert.equal(missingResponse.status, 404);
  assert.equal((await missingResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
});

test('rejeita upload em campo incorreto e não registra documento', async () => {
  const uploadUser = randomUUID();
  const form = new FormData();
  form.append('outro', new Blob(['documento']), 'arquivo.txt');

  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': uploadUser },
    body: form,
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'INVALID_UPLOAD');

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': uploadUser },
  });
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), []);
});
