FROM node:24

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
RUN npx --no-install prisma generate

COPY . .

EXPOSE 3001

# command changed for production - removed hot-reload for production
CMD ["sh", "-c", "npx prisma migrate deploy && npm run build && npm run start:prod"]
