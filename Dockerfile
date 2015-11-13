FROM node:4.2.2

ADD . /src

RUN cd /src && npm install

EXPOSE 8080

WORKDIR /src

CMD ["npm", "start"]
