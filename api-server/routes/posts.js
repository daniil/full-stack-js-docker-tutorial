const express = require('express');
const router = express.Router();
const knex = require('knex')(require('../knexfile.js').development);

router.get('/', (_req, res) => {
  knex('posts')
    .then(data => {
      res.status(200).json(data);
    })
    .catch(err => {
      console.log('Knex Error: ', err);
    });
});

module.exports = router;