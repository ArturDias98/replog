#!/bin/sh
cat > /usr/share/nginx/html/env.js << EOF
(function (window) {
  window.__env = window.__env || {};
  window.__env.googleClientId = '${GOOGLE_CLIENT_ID}';
  window.__env.apiBaseUrl = '${API_BASE_URL}';
})(window);
EOF
exec nginx -g 'daemon off;'
