const API_BASE_URL = '/api';

async function ensureSuccessfulResponse(response) {
  if (response.ok) {
    return response;
  }

  let message = 'Não foi possível concluir a operação.';
  try {
    const body = await response.json();
    message = body.error?.message || message;
  } catch {
    // Respostas sem JSON usam a mensagem padrão.
  }

  throw new Error(message);
}

export async function listDocuments(userId, signal) {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    headers: { 'X-User-Id': userId },
    signal,
  });
  await ensureSuccessfulResponse(response);
  return response.json();
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': userId },
    body: formData,
  });
  await ensureSuccessfulResponse(response);
  return response.json();
}

export async function downloadDocument(userId, documentId) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
    headers: { 'X-User-Id': userId },
  });
  await ensureSuccessfulResponse(response);
  return response.blob();
}