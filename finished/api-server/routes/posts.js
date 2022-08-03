const express = require('express');
const router = express.Router();
const knex = require('knex')(require('../knexfile.js').development);

router.get('/', (_req, res) => {
  knex('posts')
    .orderBy('id', 'desc')
    .then(data => {
      res.status(200).json(data);
    })
    .catch(err => {
      res.status(500).json({ message: 'Error fetching posts' });
    });
});

router.post('/', (req, res) => {
  knex('posts')
    .insert({
      title: req.body.title,
      body: req.body.body
    })
    .then(postId => {
      res.status(201).json({ newPostId: postId[0] });
    })
    .catch(() => {
      res.status(500).json({ message: 'Error creating new post' });
    });
});

module.exports = router;