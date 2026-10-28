const { randomUUID } = require('node:crypto');

function fromUploadedFile(file, owner) {
  return {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
  };
}

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

module.exports = { fromUploadedFile, toPublicDocument };
