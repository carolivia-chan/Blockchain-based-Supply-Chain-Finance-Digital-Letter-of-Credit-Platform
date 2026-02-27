"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { getLCContract } from "@/lib/contracts";

export default function BankApproveLC() {
  const [lcId, setLcId] = useState("");
  const [tx, setTx] = useState("");

  async function approveLC() {
    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner(); // BANK account
    const lc = getLCContract(signer);

    const txResp = await lc.approveLC(lcId);
    await txResp.wait();

    setTx(txResp.hash);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>🏦 Bank – Approve Letter of Credit</h1>

      <input
        placeholder="LC ID"
        value={lcId}
        onChange={(e) => setLcId(e.target.value)}
      />

      <br /><br />

      <button onClick={approveLC}>Approve LC</button>

      {tx && <p>Tx Hash: {tx}</p>}
    </div>
  );
}

