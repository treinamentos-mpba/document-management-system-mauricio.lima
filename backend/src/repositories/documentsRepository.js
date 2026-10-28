const path = require('node:path');

function createDocumentsRepository(storageDir) {
  const documents = new Map();

  return {
    save(document) {
      documents.set(document.id, document);
      return document;
    },

    findByOwner(owner) {
      return Array.from(documents.values())
        .filter((document) => document.owner === owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
    },

    findByIdAndOwner(id, owner) {
      const document = documents.get(id);
      return document && document.owner === owner ? document : null;
    },

    getFilePath(document) {
      return path.join(storageDir, document.storageName);
    },
  };
}

module.exports = createDocumentsRepository;