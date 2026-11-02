'use strict';
const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connect() {
  mongoose.connection.on('connected', () => logger.success('MongoDB conectado'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB desconectado'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB: ${err.message}`));
  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDb,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 15,
  });
  return mongoose.connection;
}

async function disconnect() {
  await mongoose.connection.close();
}

module.exports = { connect, disconnect, mongoose };
