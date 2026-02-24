FROM node:24

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma
RUN npx --no-install prisma generate

COPY . .

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
