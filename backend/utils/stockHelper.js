const Product = require("../models/Product");

// Decreases a product's stock by `quantity` (never goes below 0),
// and flips stockStatus to 'outOfStock' once it hits zero.
const decrementStock = async (productId, quantity) => {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return;

  const product = await Product.findById(productId);
  if (!product) return;

  const currentStock = Number(product.stock) || 0;
  const newStock = Math.max(currentStock - qty, 0);

  await Product.findByIdAndUpdate(productId, {
    stock: String(newStock),
    stockStatus: newStock === 0 ? "outOfStock" : "inStock",
  });
};

module.exports = decrementStock;
