// Minimal Vite server starter to avoid Windows '&' path issues
const { createServer } = require('vite');

(async () => {
  const server = await createServer({
    // Use current directory as root
    root: __dirname,
    server: {
      port: 5173,
      strictPort: false,
      open: false,
    },
  });
  await server.listen();
  server.printUrls();
})();
