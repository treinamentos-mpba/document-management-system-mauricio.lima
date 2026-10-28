import { useState } from 'react';

export default function UploadComponent({ isUploading, onUpload }) {
  const [file, setFile] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (file && await onUpload(file)) {
      setFile(null);
      form.reset();
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker" htmlFor="document-file">
        <span className="file-picker-icon" aria-hidden="true">+</span>
        <span className="file-picker-copy">
          <strong>{file ? file.name : 'Escolha um arquivo'}</strong>
          <span>{file ? `${file.size.toLocaleString('pt-BR')} bytes` : 'Qualquer formato de arquivo'}</span>
        </span>
        <span className="file-picker-action">Procurar</span>
        <input
          id="document-file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          type="file"
        />
      </label>
      <button className="primary-button" disabled={!file || isUploading} type="submit">
        {isUploading ? 'Enviando...' : 'Enviar arquivo'}
      </button>
    </form>
  );
}