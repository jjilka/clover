var express = require('express');
var router = express.Router();
require('dotenv').config();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Clover Sport', app_url: process.env.APP_URL });
});

module.exports = router;
