---
description: Revisa alterações do DMS antes do commit, comparando-as com a especificação e as convenções do projeto.
name: revisar-dms
argument-hint: escopo da revisão (backend, frontend ou ambos)
agent: code-reviewer
---

# Revisão pré-commit do DMS

Revise as alterações locais no escopo `${input:escopo:backend, frontend ou ambos}` antes do commit. Considere arquivos modificados, adicionados e removidos.

Use como referência `docs/specs/dms-spec.md` e `.github/copilot-instructions.md`.

## Método de revisão

1. Identifique os arquivos alterados e leia o contexto necessário, incluindo contratos e chamadas entre camadas.
2. Para riscos de segurança, rastreie entradas controladas pelo cliente até seus destinos, atravessando os arquivos relevantes. No DMS, considere `X-User-Id`, o arquivo multipart, o parâmetro `id` e `originalName`; siga-os até validação, `diskStorage`, resolução do caminho, `res.download` e respostas JSON.
3. Confira limites e fronteiras: nome físico gerado pelo servidor, caminho confinado a `STORAGE_DIR`, limite de tamanho do multer, associação do documento ao UUID em listagem/download e mensagens de erro sem detalhes internos.
4. Verifique também o contrato HTTP, a separação `routes -> controllers -> services -> repositories`, o consumo via `/api` no frontend e os testes relevantes.
5. Antes de relatar cada achado, confirme o fluxo completo, procure validações ou proteções aplicadas em middleware/outra camada e descarte hipóteses sem evidência suficiente.

## Particularidades do DMS

- `X-User-Id` é um identificador fornecido pelo cliente para demonstração, não autenticação. Registre essa limitação como risco de produção; não afirme que o cabeçalho autentica o usuário.
- O produto aceita diferentes formatos de arquivo nesta fase. Não considere, isoladamente, a ausência de uma lista MIME permitida como vulnerabilidade sem um requisito de formatos ou evidência de execução/entrega insegura.
- Diferencie risco confirmado de recomendação de endurecimento e não reporte a mesma causa em vários itens.

## Saída

Não edite arquivos nem crie commits. Apresente primeiro os achados em ordem de severidade (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`). Para cada achado, inclua caminho/linha, evidência do fluxo, impacto e correção sugerida. Se não houver problemas, diga isso claramente e liste as verificações que não foram executadas.

Método adaptado de [security-review](https://github.com/github/awesome-copilot/tree/main/skills/security-review) e [security-and-owasp](https://github.com/github/awesome-copilot/blob/main/instructions/security-and-owasp.instructions.md), com escopo e decisões do DMS.