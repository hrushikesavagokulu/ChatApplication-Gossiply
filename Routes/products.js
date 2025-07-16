const express = require('express');
const router = express.Router();
const { getAllProducts, createProduct, productDetails } = require('../Controllers/products');

// ✅ No need for: const { authenticate } = ...

router.get('/', getAllProducts);
router.post('/created', createProduct);
router.get('/details/:id', productDetails);

module.exports = router;
