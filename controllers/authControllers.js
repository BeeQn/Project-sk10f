const bcrypt = require('bcrypt');
const express = require('express');
const app = express();
// Rota para cadastro de usuários
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    await Currency.bulkCreate([
      { name: 'Bitcoin' },
      { name: 'Ethereum' },
      { name: 'Litecoin' },
    ]);

    const currencies = await Currency.findAll();

    const wallets = currencies.map((currency) => ({
      userId: user.id,
      currencyId: currency.id,
    }));

    await Wallet.bulkCreate(wallets);

    req.session.userId = user.id;

    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.render('signup', { error: 'Erro ao cadastrar usuário.' });
  }
});

// Rota para login de usuários
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.render('login', { error: 'Usuário não encontrado.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render('login', { error: 'Senha incorreta.' });
    }

    req.session.userId = user.id;

    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.render('login', { error: 'Erro ao fazer login.' });
  }
});

// Rota para logout de usuários
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Rota para visualização do dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }

  try {
    const user = await User.findOne({
      where: { id: req.session.userId },
      include: [
        {
          model: Wallet,
          include: [{ model: Currency }],
        },
        {
          model: Transaction,
          include: [{ model: Currency }],
        },
      ],
    });

    const currencies = await Currency.findAll();

    res.render('dashboard', { user, currencies });
  } catch (error) {
    console.error(error);
    res.render('dashboard', { error: 'Erro ao carregar dados do usuário.' });
  }
});

// Rota para realização de transações
app.post('/transaction', async (req, res) => {
  const { type, currencyId, amount } = req.body;

  try {
    const user = await User.findOne({
      where: { id: req.session.userId },
      include: [{ model: Wallet, where: { currencyId } }],
    });

    if (!user) {
      return res.status(404).send({ error: 'Usuário não encontrado.' });
    }

    const wallet = user.Wallets[0];

    if (type === 'deposit') {
      await wallet.update({ balance: wallet.balance + amount });
    } else if (type === 'withdraw') {
      if (wallet.balance < amount) {
        return res.status(400).send({ error: 'Saldo insuficiente.' });
      }

      await wallet.update({ balance: wallet.balance - amount });
    } else {
      return res.status(400).send({ error: 'Tipo de transação inválido.' });
    }

    await Transaction.create({
      userId: user.id,
      currencyId: wallet.currencyId,
      type,
      amount,
    });

    res.send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Erro ao realizar transação.' });
  }
});