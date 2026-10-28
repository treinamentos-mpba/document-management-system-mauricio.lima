const { randomUUID } = require('node:crypto');

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

function createDocumentsService(documentsRepository) {
  return {
    createDocument(file, owner) {
      const document = documentsRepository.save({
        id: randomUUID(),
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename,
      });

      return toPublicDocument(document);
    },

    listDocuments(owner) {
      return documentsRepository.findByOwner(owner).map(toPublicDocument);
    },

    getDocumentForDownload(id, owner) {
      const document = documentsRepository.findByIdAndOwner(id, owner);
      if (!document) {
        return null;
      }

      return {
        document: toPublicDocument(document),
        filePath: documentsRepository.getFilePath(document),
      };
    },
  };
}

module.exports = createDocumentsService;