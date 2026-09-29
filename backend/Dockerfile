# 1. Node.js version 18 (ligera)
FROM node:18-alpine

# 2. Create the folder inside the project
WORKDIR /app

# 3. Copy the files (package.json y package-lock.json)
COPY package*.json ./

# 4. Install all the tools
RUN npm install --production

# 5. Copy the rest of the app
COPY . .

# 6. Port listening 3500
EXPOSE 3500

# 7. Start app
CMD ["node", "./bin/www"]