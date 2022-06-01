const mysql = require("mysql");
require('dotenv').config();

const host = process.env.DATABASE_HOST ?? '127.0.0.1'
const username = process.env.DATABASE_USERNAME ?? 'jaikit'
const pass = process.env.DATABASE_PASS ?? 'jaikit'
const dbname = process.env.DATABASE_NAME ?? 'clover'

const db = mysql.createPool({
  host:host,
  user: username,
  password: pass,
});

db.getConnection(function(err, connection) { 
  if(err)
  {
    console.log(err)
  }
  else
  {
    console.log("Connected Successfully");
    db.query(`CREATE DATABASE IF NOT EXISTS ${dbname};`, (err) => {
      if(err)
      {
        console.log(err);
      }
      else
      {
        db.query(`USE ${dbname};`, (err) => {
          if(err)
          {
            console.log(err);
          }
          else
          {
            db.query(`CREATE TABLE IF NOT EXISTS ${dbname}.Orders (uuid VARCHAR(50) PRIMARY KEY, tax_total FLOAT NOT NULL DEFAULT 0, total FLOAT NOT NULL DEFAULT 0, created_at datetime DEFAULT NOW(), updated_at datetime DEFAULT NOW(), deleted_at datetime DEFAULT NULL)`, (err) => {
              if(err)
              {
                console.log(err);
              }
            });
          
            db.query(`CREATE TABLE IF NOT EXISTS ${dbname}.LineItems (uuid VARCHAR(50), order_id VARCHAR(50) NOT NULL, name VARCHAR(50) NOT NULL, price FLOAT NOT NULL DEFAULT 0, price_after_discount FLOAT NOT NULL DEFAULT 0, tax_rate FLOAT NOT NULL DEFAULT 0, created_at datetime DEFAULT NOW(), updated_at datetime DEFAULT NOW(), deleted_at datetime DEFAULT NULL)`, (err) => {
              if(err)
              {
                console.log(err);
              }
              else
              {
                //Adding foreign key
                db.query(`ALTER TABLE ${dbname}.LineItems ADD FOREIGN KEY (order_id) REFERENCES ${dbname}.Orders(uuid)`, (err) => {
                  if(err)
                  {
                    console.log(err);
                  }
                });
              }
            });
      
            db.query(`CREATE TABLE IF NOT EXISTS ${dbname}.Discounts (uuid VARCHAR(50), order_id VARCHAR(50) NOT NULL, name VARCHAR(50) NOT NULL, type VARCHAR(50) NOT NULL, amount FLOAT NOT NULL DEFAULT 0, apply_to VARCHAR(50) NOT NULL, created_at datetime DEFAULT NOW(), updated_at datetime DEFAULT NOW(), deleted_at datetime DEFAULT NULL)`, (err) => {
              if(err)
              {
                console.log(err);
              }
              else
              {
                //Adding foreign key
                db.query(`ALTER TABLE ${dbname}.Discounts ADD FOREIGN KEY (order_id) REFERENCES ${dbname}.Orders(uuid)`, (err) => {
                  connection.release();
                  if(err)
                  {
                    console.log(err);
                  }
                });
              }
            });
          }
        });
      }
    });
  }
});

module.exports = db;