const { fromUploadedFile, toPublicDocument } = require('./documents.mapper');

function createDocumentsService(documentsRepository) {
  return {
    createDocument(file, owner) {
      const document = documentsRepository.save(fromUploadedFile(file, owner));

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