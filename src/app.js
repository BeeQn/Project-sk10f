const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();


// Configuração do middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuração das rotas
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
app.post('/signup', authController.signup);
app.post('/login', authController.login);
app.get('/balance', userController.getBalance);
app.post('/transaction', userController.makeTransaction);
app.get('/transaction-history', userController.getTransactionHistory);

// Inicialização do servidor
const port = 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});