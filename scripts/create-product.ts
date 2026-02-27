import { ethers } from "hardhat";

async function main() {
  console.log("📦 Creating multiple products in SupplyChain...\n");
  
  const [deployer, bank, importer, exporter] = await ethers.getSigners();
  console.log("Using Importer account:", importer.address);
  
  // ✅ Địa chỉ SupplyChain đúng
  const supplyChain = await ethers.getContractAt(
    "SupplyChain",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  );
  
  // Danh sách sản phẩm muốn tạo
  const products = [
    "Coffee Beans",
    "Green Tea",
    "Rice",
    "Rubber",
    "Textiles",
    "Electronics",
    "Furniture",
    "Seafood"
  ];
  
  console.log(`🎯 Creating ${products.length} products...\n`);
  
  const createdProducts = [];
  
  for (let i = 0; i < products.length; i++) {
    try {
      console.log(`[${i + 1}/${products.length}] Creating: ${products[i]}...`);
      
      const tx = await supplyChain.connect(importer).createProduct(products[i]);
      await tx.wait();
      
      const productId = Number(await supplyChain.productCount()) - 1;
      
      createdProducts.push({
        id: productId,
        name: products[i]
      });
      
      console.log(`   ✅ Product ID: ${productId}\n`);
      
      // Đợi một chút giữa các giao dịch để tránh nonce issues
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`   ❌ Error creating ${products[i]}:`, error.message);
    }
  }
  
  // Hiển thị tổng kết
  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY - DANH SÁCH SẢN PHẨM ĐÃ TẠO");
  console.log("=".repeat(50) + "\n");
  
  createdProducts.forEach(product => {
    console.log(`ID: ${product.id} | ${product.name}`);
  });
  
  console.log("\n" + "=".repeat(50));
  console.log(`✅ Total: ${createdProducts.length} products created successfully!`);
  console.log("=".repeat(50));
  console.log("\n🎯 Sử dụng các Product ID này trong form web của bạn\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
