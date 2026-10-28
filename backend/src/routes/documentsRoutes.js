const { randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const multer = require('multer');
const express = require('express');

function createDocumentsRouter(controller, { storageDir, maxFileSizeBytes }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.diskStorage({
      destination(req, file, callback) {
        mkdir(storageDir, { recursive: true })
          .then(() => callback(null, storageDir))
          .catch(callback);
      },
      filename(req, file, callback) {
        callback(null, randomUUID());
      },
    }),
    limits: { fileSize: maxFileSizeBytes, files: 1 },
  });

  router.post('/upload', controller.validateUserId, upload.single('file'), controller.upload);
  router.get('/documents', controller.validateUserId, controller.list);
  router.get('/documents/:id/download', controller.validateUserId, controller.download);

  return router;
}

module.exports = createDocumentsRouter;