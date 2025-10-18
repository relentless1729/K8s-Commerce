const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// sample product data
const products = [
    {id: 1, name: 'Laptop', price: 999.99, stock: 50},
    {id: 1, name: 'Mouse', price: 29.99, stock: 100},
    {id: 1, name: 'Laptop', price: 79.99, stock: 75},
    {id: 1, name: 'Laptop', price: 299.99, stock: 30}
];

// Health check
app.get('/health', (req, res) => {
    res.json({status: 'healthy', service: 'product-service'});
});

// Get all products
app.get('/products', (req, res) => {
    res.json({products})
});