FROM node:24

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Vite default port
EXPOSE 5173

# Start dev server with hot-reload
# --host for access from outside of the container
CMD ["npm", "run", "dev", "--", "--host"]