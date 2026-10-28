export default function DownloadButton({ document, isLoading, onDownload }) {
  return (
    <button
      aria-label={`Baixar ${document.originalName}`}
      className="download-button"
      disabled={isLoading}
      onClick={() => onDownload(document)}
      title="Baixar documento"
      type="button"
    >
      {isLoading ? 'Baixando...' : 'Baixar'}
    </button>
  );
}