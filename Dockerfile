FROM node:24-alpine

RUN apk add --no-cache git bash

# The checkout arrives by bind mount owned by someone other than the node user, and git
# refuses a foreign repository ("dubious ownership"). Production code already passes
# `-c safe.directory=*` on each call; this covers the rest — tests and whoever uses
# git by hand inside the container.
RUN git config --system --add safe.directory '*'

# The toolkit source lives here. The validated repository is mounted at /workspace —
# they are distinct things per ADR-0003, even when they point to the same checkout.
WORKDIR /opt/living-docs
RUN mkdir -p /opt/living-docs/node_modules /workspace \
 && chown -R node:node /opt/living-docs /workspace

USER node
ENV LIVING_DOCS_TOOLKIT_ROOT=/opt/living-docs/packages/living-docs \
    LIVING_DOCS_REPO_ROOT=/workspace
CMD ["sleep", "infinity"]
