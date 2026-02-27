import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * DEPLOY ORDER (BẮT BUỘC)
 * 1. USDToken
 * 2. RoleRegistry
 * 3. SupplyChain
 * 4. LetterOfCredit
 */

// MUST MATCH IRoleRegistry.sol
const Role = {
  NONE: 0,
  ADMIN: 1,
  BANK: 2,
  EXPORTER: 3,
  IMPORTER: 4,
  LOGISTICS: 5,
} as const;

async function main() {
  console.log("\n🚀 DEPLOYING INTEGRATED LC + SUPPLY CHAIN PLATFORM\n");

  const [deployer, bank, importer, exporter, logistics] =
    await ethers.getSigners();

  console.log("📝 Deployer :", deployer.address);
  console.log("🏦 Bank     :", bank.address);
  console.log("📦 Importer :", importer.address);
  console.log("🚢 Exporter :", exporter.address);
  console.log("🚚 Logistics:", logistics.address);
  console.log("");

  // ======================================================
  // 1. USD TOKEN
  // ======================================================
  console.log("1️⃣ Deploying USDToken...");

  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy();
  await usdToken.waitForDeployment();

  const usdTokenAddress = await usdToken.getAddress();
  console.log("   ✅ USDToken:", usdTokenAddress);

  // ======================================================
  // 2. ROLE REGISTRY
  // ======================================================
  console.log("\n2️⃣ Deploying RoleRegistry...");

  const RoleRegistry = await ethers.getContractFactory("RoleRegistry");
  const roleRegistry = await RoleRegistry.deploy();
  await roleRegistry.waitForDeployment();

  const roleRegistryAddress = await roleRegistry.getAddress();
  console.log("   ✅ RoleRegistry:", roleRegistryAddress);

  // ======================================================
  // 3. SUPPLY CHAIN
  // ======================================================
  console.log("\n3️⃣ Deploying SupplyChain...");

  const SupplyChain = await ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy(roleRegistryAddress);
  await supplyChain.waitForDeployment();

  const supplyChainAddress = await supplyChain.getAddress();
  console.log("   ✅ SupplyChain:", supplyChainAddress);

  // ======================================================
  // 4. LETTER OF CREDIT
  // ======================================================
  console.log("\n4️⃣ Deploying LetterOfCredit...");

  const LetterOfCredit = await ethers.getContractFactory("LetterOfCredit");
  const lc = await LetterOfCredit.deploy(
    usdTokenAddress,
    roleRegistryAddress,
    supplyChainAddress
  );
  await lc.waitForDeployment();

  const lcAddress = await lc.getAddress();
  console.log("   ✅ LetterOfCredit:", lcAddress);

  // ======================================================
  // 5. GRANT ROLES (ĐÚNG RỒI)
  // ======================================================
  console.log("\n5️⃣ Granting roles...");

  await (await roleRegistry.grantRole(bank.address, Role.BANK)).wait();
  await (await roleRegistry.grantRole(importer.address, Role.IMPORTER)).wait();
  await (await roleRegistry.grantRole(exporter.address, Role.EXPORTER)).wait();
  await (await roleRegistry.grantRole(logistics.address, Role.LOGISTICS)).wait();

  console.log("   🎭 Roles granted successfully");

  // ======================================================
  // 6. FUND IMPORTER + APPROVE LC (FIX: WAIT TX)
  // ======================================================
  console.log("\n6️⃣ Funding importer & approving LC...");

  const buyerAmount = ethers.parseUnits("500000", 18);

  await (await usdToken.transfer(importer.address, buyerAmount)).wait();
  await (
    await usdToken.connect(importer).approve(lcAddress, buyerAmount)
  ).wait();

  console.log("   💰 Importer funded & approved LC");

  // ======================================================
  // 7. DEMO PRODUCT
  // ======================================================
  console.log("\n7️⃣ Bootstrapping demo product...");

  await (
    await supplyChain
      .connect(importer)
      .createProduct("Demo Steel Shipment")
  ).wait();

  const productId = 0;
  console.log("   📦 Demo product created (productId = 0)");

  // ======================================================
  // 8. CREATE DEMO LC (🚨 THIẾU TRƯỚC ĐÂY)
  // ======================================================
  console.log("\n8️⃣ Creating demo LC...");

  await (
    await lc
      .connect(importer)
      .openLC(
        productId,
        exporter.address,
        ethers.parseUnits("100000", 18)
      )
  ).wait();

  const lcId = 1;
  console.log("   📄 Demo LC created (lcId = 1)");

  // ======================================================
  // 9. SAVE DEPLOYMENT
  // ======================================================
  console.log("\n9️⃣ Saving deployment info...");

  const network = await ethers.provider.getNetwork();

  const deployment = {
    network: {
      name: network.name,
      chainId: Number(network.chainId),
    },
    contracts: {
      USDToken: usdTokenAddress,
      RoleRegistry: roleRegistryAddress,
      SupplyChain: supplyChainAddress,
      LetterOfCredit: lcAddress,
    },
    demo: {
      productId,
      lcId,
    },
    accounts: {
      deployer: deployer.address,
      bank: bank.address,
      importer: importer.address,
      exporter: exporter.address,
      logistics: logistics.address,
    },
    timestamp: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const filename = `deployment-${network.chainId}.json`;
  fs.writeFileSync(
    path.join(outDir, filename),
    JSON.stringify(deployment, null, 2)
  );

  console.log("   📄 Saved:", filename);
  console.log("\n🎉 DEPLOYMENT COMPLETED – FRONTEND SAFE 🎉\n");
}

main().catch((error) => {
  console.error("\n❌ DEPLOY FAILED:", error);
  process.exit(1);
});

