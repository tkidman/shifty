FROM mhart/alpine-node:7
ADD . .
RUN npm install -d
EXPOSE 3000
CMD ["npm", "start"]
