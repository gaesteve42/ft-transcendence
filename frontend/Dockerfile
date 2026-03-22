FROM node:24

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

# Vite default port
EXPOSE 5173

# command changed for production - removed hot-reload for production
RUN npm run build
CMD ["npm", "run", "preview", "--", "--host", "--port", "5173"]