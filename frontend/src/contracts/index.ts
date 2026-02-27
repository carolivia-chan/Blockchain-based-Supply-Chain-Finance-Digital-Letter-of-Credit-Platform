// contracts/index.ts - Central export for all contract-related items

import LetterOfCreditABI from "./abi/LetterOfCredit.json";
import SupplyChainABI from "./abi/SupplyChain.json";
import USDTokenABI from "./abi/USDToken.json";
import RoleRegistryABI from "./abi/RoleRegistry.json";

// Export ABIs
export { 
  LetterOfCreditABI, 
  SupplyChainABI, 
  USDTokenABI, 
  RoleRegistryABI 
};

// Contract Addresses
export const CONTRACTS = {
  USDToken: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  RoleRegistry: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  SupplyChain: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
  LetterOfCredit: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
};

// Account Addresses
export const ACCOUNTS = {
  Deployer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  Bank: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  Importer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  Exporter: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  Logistics: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
};
