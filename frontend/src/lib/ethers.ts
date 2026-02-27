import { ethers } from "ethers";

export async function getSigner(): Promise<ethers.Signer> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  // BẮT BUỘC: request account từ MetaMask
  await provider.send("eth_requestAccounts", []);

  // LẤY account đang active trong MetaMask
  return await provider.getSigner();
}

