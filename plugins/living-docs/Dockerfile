FROM node:24-alpine

RUN apk add --no-cache git bash

# The checkout arrives by bind mount owned by someone other than the node user, and git
# refuses a foreign repository ("dubious ownership"). Production code already passes
# `-c safe.directory=*` on each call; this covers the rest — tests and whoever uses
# git by hand inside the container.
RUN git config --system --add safe.directory '*'

# The whole checkout is mounted at /opt/esliph: living-docs depends on the core by
# path (plugins/ownership/plugin). The validated repository is mounted at
# /workspace — distinct things per ADR-0003, even when they are the same checkout.
WORKDIR /opt/esliph/plugins/living-docs
RUN mkdir -p /opt/esliph/plugins/living-docs/node_modules /opt/esliph/plugins/ownership/node_modules /workspace \
 && chown -R node:node /opt/esliph /workspace

USER node
ENV LIVING_DOCS_TOOLKIT_ROOT=/opt/esliph/plugins/living-docs/plugin \
    LIVING_DOCS_REPO_ROOT=/workspace
CMD ["sleep", "infinity"]
