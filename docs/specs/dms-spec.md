# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, listem e baixem documentos armazenados no filesystem local, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo
- Upload, listagem e download de documentos.
- Associação de documentos a um identificador de usuário.
- Interface web para as operações previstas.

### Fora do escopo
- Armazenamento externo ou em nuvem.
- Versionamento e exclusão de documentos.
- Cadastro e autenticação de usuários.
- Persistência dos metadados após reinício do backend.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo via `multipart/form-data`. |
| RF-02 | O sistema valida a presença do arquivo e o tamanho máximo configurado. |
| RF-03 | O sistema gera um UUID v4 para o documento e grava o arquivo localmente com nome interno seguro. |
| RF-04 | O sistema registra os metadados do documento em memória. |
| RF-05 | O usuário pode listar os documentos associados ao seu UUID. |
| RF-06 | O usuário pode baixar um documento pelo identificador se o documento estiver associado ao seu UUID. |
| RF-07 | A interface apresenta estados de carregamento, sucesso e erro nas operações. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados no filesystem local com `multer` e `diskStorage`. |
| RNF-02 | Os metadados ficam em memória e podem ser perdidos ao reiniciar o backend. |
| RNF-03 | Porta, diretório de armazenamento e tamanho máximo são configuráveis por variáveis de ambiente. |
| RNF-04 | O nome original não é usado como caminho físico do arquivo. |
| RNF-05 | Respostas de erro não expõem caminhos locais nem detalhes internos. |
| RNF-06 | O backend segue o fluxo `routes -> controllers -> services -> repositories`. |

## 5. Modelo de dados

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | UUID v4 único do documento, gerado pelo sistema. |
| `originalName` | string | Nome original do arquivo enviado. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601. |
| `owner` | string | UUID que identifica o usuário associado ao documento. |
| `storageName` | string | Nome interno usado para localizar o arquivo; não é exposto pela API. |

O caminho do arquivo é resolvido internamente a partir de `STORAGE_DIR` e `storageName`.

## 6. Contratos de API

O backend expõe as rotas abaixo. O frontend as acessa pelo prefixo `/api`, configurado no proxy do Vite. Todas as rotas de documentos recebem `X-User-Id`, com um UUID válido.

### `POST /upload`
- Entrada: `multipart/form-data`, campo `file`; cabeçalho `X-User-Id`.
- Sucesso: `201 Created`, com os metadados públicos do documento.
- Erros: `400` para arquivo ausente ou entrada inválida; `413` para arquivo acima do limite; `500` para falha de armazenamento.

### `GET /documents`
- Entrada: cabeçalho `X-User-Id`.
- Sucesso: `200 OK`, com uma lista dos metadados pertencentes ao UUID informado. Retorna lista vazia quando não houver documentos.
- Não retorna `storageName` nem caminhos locais.

### `GET /documents/:id/download`
- Entrada: UUID do documento na URL e cabeçalho `X-User-Id`.
- Sucesso: `200 OK`, conteúdo binário e `Content-Disposition` com o nome original.
- Erros: `404 Not Found` se o documento não existir ou não estiver associado ao UUID informado; `500` para falha de leitura.

Formato padrão de erro:

    {
      "error": {
        "code": "ERROR_CODE",
        "message": "Descrição compreensível do erro."
      }
    }

## 7. Decisões arquiteturais

- `routes/` registra endpoints; `controllers/` valida a entrada HTTP e monta as respostas.
- `services/` aplica as regras de negócio.
- O serviço de documentos coordena os casos de uso usando o repositório injetado; `documents.mapper.js` centraliza a construção dos metadados e sua projeção pública, sem expor `storageName`.
- `repositories/` encapsula o acesso aos arquivos locais e aos metadados em memória.
- `multer` com `diskStorage` é o único mecanismo de armazenamento de arquivos.
- O frontend usa componentes React e `fetch` por meio do serviço da aplicação.
- `PORT` define a porta do backend e tem padrão `3000`.
- `STORAGE_DIR` define o diretório de arquivos e tem padrão `backend/storage`.
- `MAX_FILE_SIZE_BYTES` define o limite de upload e tem padrão de 10 MiB.
- O protótipo usa `X-User-Id` como identificador, não como autenticação. Como o cliente pode enviar outro UUID, isso não oferece isolamento seguro entre usuários e não deve ser considerado controle de acesso para produção.
- Como os metadados são voláteis, arquivos podem permanecer no disco sem registro correspondente após reinício. Reconciliação e persistência ficam fora desta fase.

## 8. Plano de execução

1. Revisar e aprovar objetivo, escopo, requisitos, modelo de dados e contratos. Concluído.
2. Implementar a API nas camadas `routes`, `controllers`, `services` e `repositories`, com armazenamento local e metadados em memória. Concluído.
3. Implementar a interface React para upload, listagem, download e estados de erro, integrada via `/api`. Concluído.
4. Validar contratos HTTP, isolamento pelo UUID informado, limite de upload, build do frontend e proxy local. Concluído. A autenticação permanece fora do escopo.