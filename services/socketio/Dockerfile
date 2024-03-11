FROM node:18

WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

COPY dist/app.js .

EXPOSE 3000

CMD ["npm", "start"]