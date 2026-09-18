---
title: Catálogo de erros
owner: "{{OWNER}}"
trigger: >
  Código de erro novo; código que muda de status; mudança no que um código
  significa para quem consome a interface pública.
last-reviewed: {{TODAY}}
---

# Catálogo de erros

Um código, uma vez publicado, nunca muda de significado: quando sai de uso,
ganha `deprecated` e um substituto. O código é o contrato; a mensagem exibível
não é parte dele.

| Código | Significado | Quando ocorre | Transporte | Público | Status |
| --- | --- | --- | --- | --- | --- |
| CODIGO-EXEMPLO | Substitua pelo significado estável, não pela mensagem exibível | A condição observável que o dispara | HTTP 400 / exit 2 / evento | sim | active |
