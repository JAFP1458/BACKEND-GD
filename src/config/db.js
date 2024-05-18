require('dotenv').config();

const { Client } = require('pg');

const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;

async function connectToDb() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
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

