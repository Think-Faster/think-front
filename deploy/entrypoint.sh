#!/bin/sh

set -e

echo "Generating runtime configuration..."

cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = {
  API_URL: "${API_URL}"
};
EOF

echo "API_URL=${API_URL}"

envsubst \
  '${NGINX_SERVER_NAME}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"