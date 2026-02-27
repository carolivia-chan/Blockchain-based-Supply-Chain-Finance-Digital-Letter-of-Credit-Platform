import { expect } from "chai";
import { ethers } from "hardhat";
import { RoleRegistry, USDToken, SupplyChain, LetterOfCredit } from "../typechain-types";

describe("LetterOfCredit", function () {
  async function deployFixture() {
    const [admin, bank, buyer, seller] = await ethers.getSigners();
    
    // RoleRegistry
    const RoleRegistryFactory = await ethers.getContractFactory(
      "contracts/core/RoleRegistry.sol:RoleRegistry"
    );
    const roleRegistry = (await RoleRegistryFactory.deploy()) as RoleRegistry;
    await roleRegistry.waitForDeployment();
    
    // Grant roles
    await roleRegistry.grantRole(bank.address, 2);   // BANK
    await roleRegistry.grantRole(buyer.address, 4);  // IMPORTER
    await roleRegistry.grantRole(seller.address, 3); // EXPORTER
    
    // USDToken
    const USDFactory = await ethers.getContractFactory("USDToken");
    const usd = (await USDFactory.deploy()) as USDToken;
    await usd.waitForDeployment();
    await usd.mint(buyer.address, ethers.parseUnits("1000", 18));
    
    // SupplyChain
    const SCFactory = await ethers.getContractFactory("SupplyChain");
    const supplyChain = (await SCFactory.deploy(roleRegistry.target)) as SupplyChain;
    await supplyChain.waitForDeployment();
    
    // LetterOfCredit
    const LCFactory = await ethers.getContractFactory("LetterOfCredit");
    const lc = (await LCFactory.deploy(
      usd.target,
      roleRegistry.target,
      supplyChain.target
    )) as LetterOfCredit;
    await lc.waitForDeployment();
    
    return { admin, bank, buyer, seller, roleRegistry, usd, supplyChain, lc };
  }

  it("Should execute LC lifecycle correctly", async function () {
    const { bank, buyer, seller, usd, supplyChain, lc } = await deployFixture();
    
    // Buyer tạo product trên SupplyChain
    const tx = await supplyChain.connect(buyer).createProduct("Coffee Beans");
    await tx.wait();
    
    const productId = Number(await supplyChain.productCount()) - 1;
    
    // Define LC amount
    const lcAmount = ethers.parseUnits("500", 18);
    
    // Buyer approve USD cho LC
    await usd.connect(buyer).approve(lc.target, lcAmount);
    
    // Buyer (IMPORTER) mở LC với 3 tham số
    await lc.connect(buyer).openLC(productId, seller.address, lcAmount);
    
    const lcId = Number(await lc.lcCounter());
    
    // Kiểm tra LC được tạo đúng
    const lcInfo = await lc.lcs(lcId);
    expect(lcInfo.productId).to.equal(BigInt(productId));
    expect(lcInfo.buyer).to.equal(buyer.address);
    expect(lcInfo.seller).to.equal(seller.address);
    expect(lcInfo.amount).to.equal(lcAmount);
    expect(lcInfo.released).to.equal(false);
    
    // FIX: Update product status Delivered = 1, Received = 2
    await supplyChain.connect(buyer).updateStatus(productId, 1); // Delivered
    await supplyChain.connect(buyer).updateStatus(productId, 2); // Received
    
    // Bank release payment
    await lc.connect(bank).releasePayment(lcId);
    
    // Kiểm tra LC đã released
    const lcInfoAfter = await lc.lcs(lcId);
    expect(lcInfoAfter.released).to.equal(true);
    
    // Kiểm tra seller nhận được tiền
    const balance = await usd.balanceOf(seller.address);
    expect(balance).to.equal(lcAmount);
  });
});
