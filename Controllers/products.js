const Product = require("../Models/products");
const express = require("express");
async function getAllProducts(req, res) {
    try {
        const products = await Product.find();
        res.render("products", { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
}

async function createProduct(req, res) {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        console.log("Product created:", newProduct);
        HTML = `<h1>Product Created</h1>
              <p>Name: ${newProduct.name}</p>
              <p>Price: ${newProduct.price}</p>
              <p>Description: ${newProduct.description}</p>
              <a href ="/products">back</a>`;
        res.send(HTML);
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).send("Internal Server Error");
    }
}

async function productDetails(req, res) {
    const { id } = req.params;
    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).send("Product not found");
        }
        res.render("productDetails", { product });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    getAllProducts,
    createProduct,
    productDetails
};