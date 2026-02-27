import { expect } from "chai";
import { ethers } from "hardhat";
import { SupplyChain, RoleRegistry } from "../typechain-types";

describe("SupplyChain", function () {
  async function deployFixture() {
    const [admin, importer, buyer, other] = await ethers.getSigners();
    
    // RoleRegistry
    const RoleRegistryFactory = await ethers.getContractFactory(
      "contracts/core/RoleRegistry.sol:RoleRegistry"
    );
    const roleRegistry = (await RoleRegistryFactory.deploy()) as RoleRegistry;
    await roleRegistry.waitForDeployment();
    
    // Grant roles
    await roleRegistry.grantRole(importer.address, 4); // IMPORTER
    
    // Deploy SupplyChain
    const SCFactory = await ethers.getContractFactory("SupplyChain");
    const supplyChain = (await SCFactory.deploy(roleRegistry.target)) as SupplyChain;
    await supplyChain.waitForDeployment();
    
    return { admin, importer, buyer, other, roleRegistry, supplyChain };
  }

  it("Should create product and update status to Delivered + Received", async function () {
    const { importer, supplyChain } = await deployFixture();
    
    // IMPORTER tạo product
    const tx = await supplyChain.connect(importer).createProduct("Coffee Beans");
    await tx.wait();
    
    // Lấy productId
    const productId = Number(await supplyChain.productCount()) - 1;
    
    // Status ban đầu = Created (0)
    expect(await supplyChain.getProductStatus(productId)).to.equal(0n);
    
    // FIX: Update status Delivered = 1 (không phải 8)
    await supplyChain.connect(importer).updateStatus(productId, 1);
    expect(await supplyChain.isProductDelivered(productId)).to.equal(true);
    
    // FIX: Update status Received = 2 (không phải 9)
    await supplyChain.connect(importer).updateStatus(productId, 2);
    expect(await supplyChain.isProductReceived(productId)).to.equal(true);
  });
});
