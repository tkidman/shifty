FROM mhart/alpine-node:7
ADD . .
RUN npm install -d --production
EXPOSE 3000
CMD ["npm", "start"]
