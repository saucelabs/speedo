FROM node:10.16.0

WORKDIR /speedo
ADD . /speedo

RUN SAUCE_CONNECT_DOWNLOAD_ON_INSTALL=true npm install
RUN npm run build

ENV PATH $PATH:/speedo/bin

ENTRYPOINT ["speedo"]
CMD ["--help"]
