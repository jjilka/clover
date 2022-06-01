
var express = require('express');
const database = require("../database");
var router = express.Router();
var OrderController = require('../controller/OrderController');

//create order
router.post('/', function(req, res, next) {

    let orderController = new OrderController();

    var lineItems = req.body.line_items;
    var discounts = req.body.discounts;
    var order_uuid = req.body.uuid;
    database.getConnection((err, connection) => {
        connection.beginTransaction(async (err) => {
        try
        {
            if(order_uuid)
            {
                let order = await orderController.addOrder(order_uuid, connection);
                if(order.result != "success")
                {
                    throw new Error(order.message);
                }
                if(lineItems)
                {
                    let lineitemsresult = await orderController.addLineItems(lineItems, order_uuid, connection);
                    if(lineitemsresult.result != "success")
                    {
                        throw new Error(lineitemsresult.message);
                    }
                }
                if(discounts)
                {
                    let discountresult = await orderController.addDiscounts(discounts, order_uuid, connection);
                    if(discountresult.result != "success")
                    {
                        throw new Error(discountresult.message);
                    }
                }
                
                connection.commit(async () => {
                    connection.release();
                    let calOrder = await orderController.calculateOrder(order_uuid);
                    res.send(calOrder);
                });
            }
        }
        catch(err)
        {
            connection.rollback(() => {
                connection.release();
                next(err);
            });
            
        }
    });
});
    
    
});


//update order
router.put('/:uuid', async function(req, res, next) {

    database.getConnection((err, connection) => {
        connection.beginTransaction(async () => {
            try
            {
                let orderController = new OrderController();
                let order_id = req.params.uuid;
                var lineItems = req.body.line_items;
                var discounts = req.body.discounts;

                let order = await orderController.getOrder(order_id);
                if(!order.length)
                {
                    return res.status(404).send("Order not found")
                }
                if(lineItems)
                {
                    let lineitemsresult = await orderController.addLineItems(lineItems, order_id, connection);
                    if(lineitemsresult.result != "success")
                    {
                        throw new Error(lineitemsresult.message);
                    }
                }
                if(discounts)
                {
                    let discountresult = await orderController.addDiscounts(discounts, order_id, connection);
                    if(discountresult.result != "success")
                    {
                        throw new Error(discountresult.message);
                    }
                }

                connection.commit(async () => {
                    connection.release();
                    let calOrder = await orderController.calculateOrder(order_id);
                    res.send(calOrder);
                });
            }
            catch(err)
            {
                connection.rollback(() => {
                    connection.release();
                    next(err);
                });
            }
            
        });
    });
});

///get order
router.get('/:uuid', async function(req, res, next) {

    let orderController = new OrderController();
    let order_id = req.params.uuid;
    database.getConnection(async (err, connection) => {
        try
        {
            let order = await orderController.getOrder(order_id);
            if(!order.length)
            {
                return res.status(404).send("Order not found")
            }
            order = await orderController.calculateOrder(order_id);
            res.send(order);
        }
        catch(err)
        {
            next(err)
        }
    });
});


module.exports = router;