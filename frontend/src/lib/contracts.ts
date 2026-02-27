import { ethers } from "ethers";
import SupplyChainABI from "@/contracts/abi/SupplyChain.json";
import LCABI from "@/contracts/abi/LetterOfCredit.json";
import RoleRegistryABI from "@/contracts/abi/RoleRegistry.json";
import USDTokenABI from "@/contracts/abi/USDToken.json";

// Contract addresses from environment variables
export const ADDRESSES = {
  SUPPLY_CHAIN: process.env.NEXT_PUBLIC_SUPPLY_CHAIN_ADDRESS || "",
  LETTER_OF_CREDIT: process.env.NEXT_PUBLIC_LETTER_OF_CREDIT_ADDRESS || "",
  ROLE_REGISTRY: process.env.NEXT_PUBLIC_ROLE_REGISTRY_ADDRESS || "",
  USD_TOKEN: process.env.NEXT_PUBLIC_USD_TOKEN_ADDRESS || "",
};

// Alias for compatibility - CONTRACTS points to same addresses
export const CONTRACTS = {
  SupplyChain: ADDRESSES.SUPPLY_CHAIN,
  LetterOfCredit: ADDRESSES.LETTER_OF_CREDIT,
  RoleRegistry: ADDRESSES.ROLE_REGISTRY,
  USDToken: ADDRESSES.USD_TOKEN,
};

// Test accounts - replace with your actual addresses
export const ACCOUNTS = {
  Importer: process.env.NEXT_PUBLIC_IMPORTER_ADDRESS || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  Bank: process.env.NEXT_PUBLIC_BANK_ADDRESS || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  Exporter: process.env.NEXT_PUBLIC_EXPORTER_ADDRESS || "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  Logistics: process.env.NEXT_PUBLIC_LOGISTICS_ADDRESS || "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
};

// Log addresses on load (helpful for debugging)
if (typeof window !== "undefined") {
  console.log("📋 Contract Addresses:");
  console.log("- SupplyChain:", ADDRESSES.SUPPLY_CHAIN);
  console.log("- LetterOfCredit:", ADDRESSES.LETTER_OF_CREDIT);
  console.log("- RoleRegistry:", ADDRESSES.ROLE_REGISTRY);
  console.log("- USDToken:", ADDRESSES.USD_TOKEN);
  
  console.log("\n👥 Test Accounts:");
  console.log("- Importer:", ACCOUNTS.Importer);
  console.log("- Bank:", ACCOUNTS.Bank);
  console.log("- Exporter:", ACCOUNTS.Exporter);
  console.log("- Logistics:", ACCOUNTS.Logistics);
}

export function getSupplyChainContract(signer: ethers.Signer) {
  return new ethers.Contract(
    ADDRESSES.SUPPLY_CHAIN,
    SupplyChainABI.abi,
    signer
  );
}

export function getLCContract(signer: ethers.Signer) {
  return new ethers.Contract(
    ADDRESSES.LETTER_OF_CREDIT,
    LCABI.abi,
    signer
  );
}

export function getRoleRegistryContract(signer: ethers.Signer) {
  return new ethers.Contract(
    ADDRESSES.ROLE_REGISTRY,
    RoleRegistryABI.abi,
    signer
  );
}

export function getUSDTokenContract(signer: ethers.Signer) {
  return new ethers.Contract(
    ADDRESSES.USD_TOKEN,
    USDTokenABI.abi,
    signer
  );
}

// Helper: Check if user has a specific role
export async function checkUserRole(
  signer: ethers.Signer,
  role: 0 | 1 | 2 | 3 // IMPORTER=0, BANK=1, EXPORTER=2, LOGISTICS=3
): Promise<boolean> {
  const roleRegistry = getRoleRegistryContract(signer);
  const address = await signer.getAddress();
  return await roleRegistry.hasRole(address, role);
}

// Helper: Get user's roles
export async function getUserRoles(signer: ethers.Signer): Promise<string[]> {
  const roles = ["IMPORTER", "BANK", "EXPORTER", "LOGISTICS"];
  const userRoles: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    const hasRole = await checkUserRole(signer, i as 0 | 1 | 2 | 3);
    if (hasRole) {
      userRoles.push(roles[i]);
    }
  }
  
  return userRoles;
}

// Helper: Get LC status name
export function getLCStatusName(status: number): string {
  const statuses = [
    "OPENED",
    "APPROVED", 
    "SHIPPED",
    "DELIVERED_PENDING",
    "DELIVERED_CONFIRMED",
    "UNDER_REVIEW",
    "PAID",
    "CANCELLED"
  ];
  return statuses[status] || "UNKNOWN";
}

// Helper: Get Product status name
export function getProductStatusName(status: number): string {
  const statuses = ["Created", "Delivered", "Received"];
  return statuses[status] || "UNKNOWN";
}
