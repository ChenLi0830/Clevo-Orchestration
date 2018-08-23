FROM node:8.9

RUN echo "deb http://ftp.uk.debian.org/debian jessie-backports main" >> /etc/apt/sources.list \
&& apt-get update \
&& apt-get install ffmpeg -y

EXPOSE 3000
