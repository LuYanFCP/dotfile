FROM ubuntu:18.04
RUN sed -i -e "s/archive.ubuntu/mirrors.aliyun/g; s/security.ubuntu/mirrors.aliyun/g" /etc/apt/sources.list
RUN apt-get update && apt-get install python3-pip -y 
