require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Sync database
    await sequelize.sync();
    console.log('Database synced successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`Transaction service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 