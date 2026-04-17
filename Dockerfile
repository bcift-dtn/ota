FROM node:24-alpine

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY --chown=node:node package*.json ./

USER node

RUN npm install ci --only=production

COPY --chown=node:node . .

EXPOSE 3000

CMD ["node", "server.js"]
