FROM node:18

WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY *.json ./
RUN npm install

COPY ./src ./src
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]