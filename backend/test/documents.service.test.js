const assert = require('node:assert/strict');
const { mock, test } = require('node:test');
const createDocumentsService = require('../src/services/documents.service');

const owner = 'd90a3784-e2f3-484e-a698-5b4351611681';
const storedDocument = {
  id: '2782f927-aa91-478a-a906-28d0c7795883',
  originalName: 'relatorio.txt',
  size: 17,
  uploadedAt: '2026-01-01T00:00:00.000Z',
  owner,
  storageName: 'arquivo-interno',
};
const publicDocument = {
  id: storedDocument.id,
  originalName: storedDocument.originalName,
  size: storedDocument.size,
  uploadedAt: storedDocument.uploadedAt,
  owner,
};

test('cria metadados do upload e retorna uma copia publica sem alterar a persistencia', () => {
  const file = { originalname: 'relatorio.txt', size: 17, filename: 'arquivo-interno' };
  const originalFile = { ...file };
  const save = mock.fn((document) => document);
  const service = createDocumentsService({ save });
  const before = Date.now();

  const result = service.createDocument(file, owner);
  const savedDocument = save.mock.calls[0].arguments[0];

  assert.equal(save.mock.callCount(), 1);
  assert.match(savedDocument.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(savedDocument.originalName, file.originalname);
  assert.equal(savedDocument.size, file.size);
  assert.equal(savedDocument.owner, owner);
  assert.equal(savedDocument.storageName, file.filename);
  assert.equal(new Date(savedDocument.uploadedAt).toISOString(), savedDocument.uploadedAt);
  assert.ok(Date.parse(savedDocument.uploadedAt) >= before);
  assert.ok(Date.parse(savedDocument.uploadedAt) <= Date.now());
  const { storageName, ...expected } = savedDocument;
  assert.deepEqual(result, expected);
  assert.notStrictEqual(result, savedDocument);
  assert.deepEqual(file, originalFile);
  assert.equal(savedDocument.storageName, 'arquivo-interno');
});

test('usa o documento retornado pelo repositorio ao criar a resposta', () => {
  const service = createDocumentsService({ save: () => storedDocument });

  assert.deepEqual(service.createDocument({
    originalname: 'relatorio.txt', size: 17, filename: 'arquivo-interno',
  }, owner), publicDocument);
});

test('lista documentos publicos do dono preservando a ordem e os metadados internos', () => {
  const secondDocument = { ...storedDocument, id: 'outro-id', storageName: 'outro-arquivo' };
  const findByOwner = mock.fn(() => [storedDocument, secondDocument]);
  const service = createDocumentsService({ findByOwner });

  const result = service.listDocuments(owner);

  assert.deepEqual(findByOwner.mock.calls[0].arguments, [owner]);
  assert.deepEqual(result, [publicDocument, { ...publicDocument, id: secondDocument.id }]);
  assert.equal(storedDocument.storageName, 'arquivo-interno');
  assert.equal(secondDocument.storageName, 'outro-arquivo');
});

test('retorna lista vazia quando o dono nao possui documentos', () => {
  const service = createDocumentsService({ findByOwner: () => [] });

  assert.deepEqual(service.listDocuments(owner), []);
});

test('resolve o download com o documento interno sem expor storageName', () => {
  const findByIdAndOwner = mock.fn(() => storedDocument);
  const getFilePath = mock.fn(() => '/storage/arquivo-interno');
  const service = createDocumentsService({ findByIdAndOwner, getFilePath });

  assert.deepEqual(service.getDocumentForDownload(storedDocument.id, owner), {
    document: publicDocument,
    filePath: '/storage/arquivo-interno',
  });
  assert.deepEqual(findByIdAndOwner.mock.calls[0].arguments, [storedDocument.id, owner]);
  assert.strictEqual(getFilePath.mock.calls[0].arguments[0], storedDocument);
  assert.equal(storedDocument.storageName, 'arquivo-interno');
});

test('nao resolve caminhos para documento ausente ou pertencente a outro dono', () => {
  const findByIdAndOwner = mock.fn(() => null);
  const getFilePath = mock.fn();
  const service = createDocumentsService({ findByIdAndOwner, getFilePath });

  assert.equal(service.getDocumentForDownload(storedDocument.id, 'outro-dono'), null);
  assert.deepEqual(findByIdAndOwner.mock.calls[0].arguments, [storedDocument.id, 'outro-dono']);
  assert.equal(getFilePath.mock.callCount(), 0);
});

test('propaga falhas de persistencia sem converter falhas em sucesso', () => {
  const error = new Error('Falha de persistencia');
  const fail = () => { throw error; };
  const service = createDocumentsService({
    save: fail,
    findByOwner: fail,
    findByIdAndOwner: fail,
  });

  assert.throws(() => service.createDocument({}, owner), (received) => received === error);
  assert.throws(() => service.listDocuments(owner), (received) => received === error);
  assert.throws(() => service.getDocumentForDownload(storedDocument.id, owner), (received) => received === error);
});
