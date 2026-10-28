const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function createDocumentsController(documentsService) {
  return {
    validateUserId(req, res, next) {
      const userId = req.get('X-User-Id');
      if (!userId || !UUID_PATTERN.test(userId)) {
        return sendError(res, 400, 'INVALID_USER_ID', 'Informe um UUID válido no cabeçalho X-User-Id.');
      }

      req.userId = userId.toLowerCase();
      return next();
    },

    async upload(req, res, next) {
      if (!req.file) {
        return sendError(res, 400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
      }

      try {
        const document = documentsService.createDocument(req.file, req.userId);
        return res.status(201).json(document);
      } catch (error) {
        return next(error);
      }
    },

    list(req, res, next) {
      try {
        return res.json(documentsService.listDocuments(req.userId));
      } catch (error) {
        return next(error);
      }
    },

    download(req, res, next) {
      if (!UUID_PATTERN.test(req.params.id)) {
        return sendError(res, 400, 'INVALID_DOCUMENT_ID', 'O identificador do documento deve ser um UUID válido.');
      }

      try {
        const result = documentsService.getDocumentForDownload(req.params.id, req.userId);
        if (!result) {
          return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
        }

        return res.download(result.filePath, result.document.originalName, (error) => {
          if (error && !res.headersSent) {
            next(error);
          }
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = createDocumentsController;