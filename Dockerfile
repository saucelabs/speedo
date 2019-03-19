FROM mhart/alpine-node:10.15.0

WORKDIR /speedo
ADD . /speedo

RUN npm install
RUN npm run build

ENV PATH $PATH:/speedo/bin

ENTRYPOINT ["speedo"]
CMD ["run", "analyze"]
