const res = require("express/lib/response");
const database = require("../database");
require('dotenv').config();

const dbname = process.env.DATABASE_NAME ?? 'clover'

const OrderController=  class {

    addOrder(order_id, connection)
    {
        const orderPromise = new Promise((resolve, reject) => {
            connection.query(`INSERT INTO ${dbname}.Orders (UUID)
            VALUES ('${order_id}');`, (err) => {
                if(err)
                {
                    reject({"result": "error", "message": err})
                }
                else
                {
                   resolve({"result": "success", "message": "Order Created"});
                }
            });
        });

        return orderPromise;
    }

    addLineItem(lineItem, order_id, connection) {
        const lineItemPromise = new Promise((resolve, reject) => {
            connection.query(`INSERT INTO ${dbname}.LineItems (UUID, order_id, name, price, price_after_discount, tax_rate)
            VALUES (?,?,?,?,?,?)`, [lineItem.uuid, order_id, lineItem.name, (lineItem.price * lineItem.quantity), (lineItem.price * lineItem.quantity), lineItem.tax_rate] , (err) => {
                if(err)
                {
                    reject({"result": "error", "message": err});
                }
                else
                {
                    resolve({"result": "success", "message": "Lineitem Created"});
                }
            })
        });

        return lineItemPromise;
    }

    addLineItems(lineItems, order_id, connection) {

        let lineItemPromiseList = [];

        lineItems.forEach(lineItem => {
            lineItemPromiseList.push(this.addLineItem(lineItem, order_id, connection));
        });

        const addLineItemsPromise = Promise.all(lineItemPromiseList).then((data) => {
            return {"result": "success", "message": data};
        }).catch(err => {
            return {"result": "error", "message": err.message};
        });

        return addLineItemsPromise;
    }

    addDiscount(discount, order_id, connection)
    {
        const discountPromise = new Promise((resolve, reject) => {
            connection.query(`INSERT INTO ${dbname}.Discounts (UUID, order_id, name, type, amount, apply_to)
            VALUES (?,?,?,?,?,?)`,  [discount.uuid, order_id, discount.name, discount.type, discount.amount, discount.apply_to], (err) => {
                if(err)
                {
                    reject({"result": "error", "message": err});
                }
                else
                {
                    resolve({"result": "Success", "message": "Discount Created"})
                }
            });
        });
        return discountPromise;
    }

    addDiscounts(discounts, order_id, connection) {

        let discountPromiseList = [];

        discounts.forEach(discount => {
            discountPromiseList.push(this.addDiscount(discount, order_id, connection));
        });

        const addDiscountPromise = Promise.all(discountPromiseList).then((data) => {
            return {"result": "success", "message": data};
        }).catch(err => {
            return {"result": "error", "message": err.message};
        });
        return addDiscountPromise;
    }

    getOrder(order_id) {

        const discountPromise = new Promise((resolve, reject) => {
            database.query(`SELECT * FROM ${dbname}.Orders where uuid = '${order_id}';`, (err, result, fields) => {
                if(err)
                {
                    reject(err);
                }
                else
                {
                    resolve(result);
                }
            });
        });

        return discountPromise;
    }

    getOrderLineItem(order_id) {
        const lineItemPromise = new Promise((resolve, reject) => {
            database.query(`SELECT uuid, name, price, price_after_discount, tax_rate FROM ${dbname}.LineItems where order_id = '${order_id}';`, (err, result, fields) => {
                if(err)
                {
                    reject(err);
                }
                else
                {
                    resolve(result);
                }
            });
        });

        return lineItemPromise;
    }

    getOrderDiscount(order_id) {

        const discountPromise = new Promise((resolve, reject) => {
            database.query(`SELECT uuid, name, type, amount, apply_to FROM ${dbname}.Discounts where order_id = '${order_id}' ORDER BY created_at ASC;`, (err, result, fields) => {
                if(err)
                {
                    reject(err);
                }
                else
                {
                    resolve(result);
                }
            });
        });

        return discountPromise;
    }

    async calculateOrder(order_id)
    {
        let total = 0;
        let totalBeforeDiscount = 0;
        let total_tax_rate = 0;
        let tax = 0;
        let order = {
            "uuid": order_id
        }
        let orderLineItems = await this.getOrderLineItem(order_id);
        let orderDiscounts = await this.getOrderDiscount(order_id);
        let wholeOrderDiscount = null;
        let lineItemDiscounts = [];
        let lineItemMap = new Map();

        //separate whole order discount and lineitem discount
        for(let i = 0;i<orderDiscounts.length;i++)
        {
            if(orderDiscounts[i].apply_to == order_id)
            {
                //only take the last order discount
                wholeOrderDiscount = orderDiscounts[i];
            }
            else
            {
                lineItemDiscounts.push(orderDiscounts[i]);
            }
        }
        //map lineitems of the order
        orderLineItems.forEach(orderLineItem => {
            total_tax_rate += orderLineItem.tax_rate;
            lineItemMap.set(orderLineItem.uuid, orderLineItem);
        });

        //now update the linetimes based on the discount;
        lineItemDiscounts.forEach(lineItemDiscount => {

            let lineItem = lineItemMap.get(lineItemDiscount.apply_to);
            if(lineItem)
            {
                if(lineItemDiscount.type == "amount")
                {
                    lineItem.price_after_discount = lineItem.price_after_discount -  lineItemDiscount.amount;
                }
                else if(lineItemDiscount.type == "percent")
                {
                    lineItem.price_after_discount = lineItem.price_after_discount - (lineItem.price_after_discount *  lineItemDiscount.amount);
                }

                lineItemMap.set(lineItemDiscount.apply_to,lineItem);
                
            }
        });

        //calculate total order value, totalbefore discount for whole order discount and the tax;
        for(let [key, value] of lineItemMap)
        {
            total += value.price_after_discount;
            totalBeforeDiscount += value.price;
            tax += value.price_after_discount * value.tax_rate;
        }
        
        //apply whole order discount
        //there whill be only one whole order discount
        if(wholeOrderDiscount)
        {
            if(wholeOrderDiscount.type == "amount")
            {
                total = total - wholeOrderDiscount.amount;
                tax = tax - (wholeOrderDiscount.amount * total_tax_rate);
            }
            else if(wholeOrderDiscount.type == "percent")
            {
                total = total  - (totalBeforeDiscount * wholeOrderDiscount.amount);
                totalBeforeDiscount = totalBeforeDiscount - (totalBeforeDiscount * wholeOrderDiscount.amount);
                tax = tax  - (tax * wholeOrderDiscount.amount);
            }
        };

        orderLineItems.forEach(orderLineItem => delete orderLineItem["price_after_discount"]);
        order.line_items = orderLineItems;
        order.discounts = orderDiscounts;
        if(tax <  0)
        {
            tax = 0;
        }
        order.tax = Math.ceil(tax);

        //make sure total is not less then zero
        order.total = Math.ceil(((total > 0 ? total : 0) + order.tax));
        return order;
        
    }
}

module.exports = OrderController;