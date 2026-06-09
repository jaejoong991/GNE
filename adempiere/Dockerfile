FROM ubuntu:14.04

# Fix apt sources for EOL Ubuntu 14.04
RUN sed -i 's|http://archive.ubuntu.com|http://old-releases.ubuntu.com|' /etc/apt/sources.list && \
    sed -i 's|http://security.ubuntu.com|http://old-releases.ubuntu.com|' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-7-jre-headless \
        wget \
        unzip \
        postgresql-client \
        netcat-openbsd && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-7-openjdk-amd64
ENV ADEMPIERE_HOME=/opt/Adempiere

RUN mkdir -p $ADEMPIERE_HOME

# IMPORTANT:
# Before building, place your extracted Adempiere folder here as adempiere/Adempiere/
# Example: if you have Adempiere 3.8.0 extracted locally, copy its contents into:
#   /Users/jeffgun/Documents/GitHub/GNE/adempiere/Adempiere/
#
# The COPY below will put those files into /opt/Adempiere inside the image.
COPY Adempiere/ $ADEMPIERE_HOME/

# Ensure shell scripts are executable
RUN find $ADEMPIERE_HOME -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR $ADEMPIERE_HOME
EXPOSE 8080 8443

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["utils/RUN_Server2.sh"]
