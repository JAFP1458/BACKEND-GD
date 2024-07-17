require('dotenv').config();

const { Client } = require('pg');

const { DATABASE_URL } = process.env;

async function connectToDb() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  await client.connect();
  return client;
}

async function query(text, params) {
  const client = await connectToDb();
  try {
    const { rows } = await client.query(text, params);
    client.end(); // Cerrar la conexión al finalizar
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

module.exports = {
  query,
};
