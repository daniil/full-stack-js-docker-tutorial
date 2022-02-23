const express = require('express');
const app = express();

require('dotenv').config();

const PORT = process.env.PORT || 5050;

app.get('/', (_req, res) => {
  res.status(200).send('Server is up and running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on ${PORT}`);
});