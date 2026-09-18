FROM node:24-alpine

RUN apk add --no-cache git bash

# A fonte do toolkit mora aqui. O repositório validado é montado em /workspace —
# são coisas distintas por ADR-0003, mesmo quando apontam para o mesmo checkout.
WORKDIR /opt/living-docs
RUN mkdir -p /opt/living-docs/node_modules /workspace \
 && chown -R node:node /opt/living-docs /workspace

USER node
ENV LIVING_DOCS_TOOLKIT_ROOT=/opt/living-docs/packages/living-docs \
    LIVING_DOCS_REPO_ROOT=/workspace
CMD ["sleep", "infinity"]
