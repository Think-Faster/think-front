// Прокси dev-сервера (npm start): /api/* уходит на стенд dev.
// tf-funnel принимает WebSocket только с Origin стенда, поэтому Origin подменяется на https://greefob.ru.
// Cookie стенда переписываются на localhost, чтобы браузер отправлял access_token обратно.
const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET = process.env.TF_DEV_API_TARGET || 'https://greefob.ru';

module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: TARGET,
      changeOrigin: true,
      secure: true,
      ws: true,
      cookieDomainRewrite: '',
      onProxyReq(proxyReq) {
        proxyReq.setHeader('origin', TARGET);
      },
      onProxyReqWs(proxyReq) {
        proxyReq.setHeader('origin', TARGET);
      },
    })
  );
};
