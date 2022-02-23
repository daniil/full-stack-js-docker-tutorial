const express = require('express');
const cors = require('cors');
const app = express();

require('dotenv').config();

const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.status(200).send('Server is up and running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on ${PORT}`);
});