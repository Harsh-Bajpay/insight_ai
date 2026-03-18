FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite default port
EXPOSE 5173

# Expose host to allow external access within Docker network
CMD ["npm", "run", "dev", "--", "--host"]
