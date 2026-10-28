import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documentService.js';
import './App.css';

function getInitialUserId() {
  const storedUserId = window.localStorage.getItem('dms-user-id');
  if (storedUserId) {
    return storedUserId;
  }

  const generatedUserId = window.crypto.randomUUID();
  window.localStorage.setItem('dms-user-id', generatedUserId);
  return generatedUserId;
}

export default function App() {
  const [userId, setUserId] = useState(getInitialUserId);
  const [userIdInput, setUserIdInput] = useState(userId);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();
    setIsLoading(true);
    setFeedback(null);

    listDocuments(userId, abortController.signal)
      .then(setDocuments)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setDocuments([]);
          setFeedback({ type: 'error', text: error.message });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [userId]);

  function handleUserIdSubmit(event) {
    event.preventDefault();
    const nextUserId = userIdInput.trim();
    if (!nextUserId) {
      setFeedback({ type: 'error', text: 'Informe um UUID de usuário.' });
      return;
    }

    window.localStorage.setItem('dms-user-id', nextUserId);
    setUserId(nextUserId);
  }

  async function handleUpload(file) {
    setIsUploading(true);
    setFeedback(null);

    try {
      await uploadDocument(userId, file);
      setDocuments(await listDocuments(userId));
      setFeedback({ type: 'success', text: 'Documento enviado.' });
      return true;
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setFeedback(null);

    try {
      const file = await downloadDocument(userId, document.id);
      const objectUrl = window.URL.createObjectURL(file);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.originalName;
      link.click();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-content">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">Documentos</span>
          <span className="topbar-label">GESTÃO LOCAL</span>
        </div>
      </header>

      <main className="page-content">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ESPAÇO DE TRABALHO</p>
            <h1 id="page-title">Seus documentos</h1>
          </div>
          <span className="storage-indicator"><span />Armazenamento local</span>
        </section>

        <form className="identity-form" onSubmit={handleUserIdSubmit}>
          <label htmlFor="user-id">UUID do usuário</label>
          <input
            autoComplete="off"
            id="user-id"
            onChange={(event) => setUserIdInput(event.target.value)}
            spellCheck="false"
            value={userIdInput}
          />
          <button type="submit">Trocar usuário</button>
          <p>Identificador de demonstração; não é uma autenticação.</p>
        </form>

        {feedback && (
          <p className={`feedback feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
            {feedback.text}
          </p>
        )}

        <section className="workspace-section" aria-labelledby="upload-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ADICIONAR</p>
              <h2 id="upload-title">Enviar documento</h2>
            </div>
          </div>
          <UploadComponent isUploading={isUploading} onUpload={handleUpload} />
        </section>

        <section className="workspace-section documents-section" aria-labelledby="documents-title">
          <div className="section-heading list-heading">
            <div>
              <p className="eyebrow">ARQUIVOS DO USUÁRIO</p>
              <h2 id="documents-title">Documentos</h2>
            </div>
            {!isLoading && <span className="document-count">{documents.length}</span>}
          </div>
          <DocumentList
            documents={documents}
            downloadingId={downloadingId}
            isLoading={isLoading}
            onDownload={handleDownload}
          />
        </section>
      </main>
    </div>
  );
}
