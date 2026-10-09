   const calculateTotal = (cartItems) => {
     const subtotal = cartItems.reduce((sum, item) => {
       const price = Number(item.productId.actualPrice) || 0;
       const discount = Number(item.productId.discount) || 0;
       return sum + Math.round(price - (price * discount) / 100) * Number(item.quantity);
     }, 0);
     const shipping = subtotal > 5000 ? 0 : 99;
     return { subtotal, shipping, total: subtotal + shipping };
   };
   module.exports = calculateTotal;