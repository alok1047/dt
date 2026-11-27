const createApp = require("./app");

const PORT = process.env.PORT || 8000;
const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Fitness & Monitoring API server running on port ${PORT}`);
  });
}

module.exports = app;
