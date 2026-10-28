// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const path = require('node:path');
const express = require('express');
const createDocumentsRepository = require('./repositories/documentsRepository');
const createDocumentsService = require('./services/documentsService');
const createDocumentsController = require('./controllers/documentsController');
const createDocumentsRouter = require('./routes/documentsRoutes');

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function parseMaxFileSize(value) {
  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_MAX_FILE_SIZE_BYTES;
}

function createApp({
  storageDir = process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage'),
  maxFileSizeBytes = parseMaxFileSize(process.env.MAX_FILE_SIZE_BYTES),
} = {}) {
  const app = express();
  const resolvedStorageDir = path.resolve(storageDir);
  const documentsRepository = createDocumentsRepository(resolvedStorageDir);
  const documentsService = createDocumentsService(documentsRepository);
  const documentsController = createDocumentsController(documentsService);

  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentsRouter(documentsController, {
    storageDir: resolvedStorageDir,
    maxFileSizeBytes,
  }));

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'A rota solicitada não existe.' },
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o tamanho máximo permitido.' },
      });
    }

    if (error.name === 'MulterError') {
      return res.status(400).json({
        error: { code: 'INVALID_UPLOAD', message: 'Não foi possível processar o arquivo enviado.' },
      });
    }

    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' },
    });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`DMS backend ouvindo na porta ${port}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
