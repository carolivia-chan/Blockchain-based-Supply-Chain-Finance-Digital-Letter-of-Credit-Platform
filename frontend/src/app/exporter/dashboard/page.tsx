"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getLCContract } from "@/lib/contracts";

export default function ExporterConfirmShipment() {
  const [lcId, setLcId] = useState("");
  const [lcInfo, setLcInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const STATUS_NAMES = ["OPENED", "APPROVED", "SHIPPED", "DELIVERED_PENDING", "DELIVERED_CONFIRMED", "UNDER_REVIEW", "PAID", "CANCELLED"];

  async function checkLC() {
    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const lc = getLCContract(signer);

      const lcData = await lc.lcs(lcId);
      const currentAddress = await signer.getAddress();

      setLcInfo({
        productId: lcData.productId.toString(),
        buyer: lcData.buyer,
        seller: lcData.seller,
        bank: lcData.bank,
        amount: ethers.formatEther(lcData.amount),
        status: Number(lcData.status),
        statusName: STATUS_NAMES[Number(lcData.status)],
        isExporter: currentAddress.toLowerCase() === lcData.seller.toLowerCase(),
        canShip: Number(lcData.status) === 1 // APPROVED
      });

    } catch (err: any) {
      setError(err.message || "Failed to fetch LC");
    } finally {
      setLoading(false);
    }
  }

  async function confirmShipment() {
    if (!window.ethereum) return;

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const lc = getLCContract(signer);

      console.log("Confirming shipment for LC:", lcId);
      const tx = await lc.confirmShipment(lcId);
      console.log("Transaction sent:", tx.hash);
      
      await tx.wait();
      setSuccess(`✅ Shipment confirmed! TX: ${tx.hash}`);
      
      // Refresh LC info
      await checkLC();

    } catch (err: any) {
      console.error("Shipment error:", err);
      
      if (err.message?.includes("Only Exporter")) {
        setError("❌ Only the Exporter (seller) can confirm shipment");
      } else if (err.message?.includes("Not approved")) {
        setError("❌ LC must be APPROVED by Bank first");
      } else {
        setError(err.message || "Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40, color: '#fff', backgroundColor: '#000', minHeight: '100vh' }}>
      <h1>🚢 Exporter – Confirm Shipment</h1>
      
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Enter LC ID"
          value={lcId}
          onChange={(e) => setLcId(e.target.value)}
          style={{ 
            padding: 10, 
            width: 200, 
            marginRight: 10,
            fontSize: 16,
            backgroundColor: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 4
          }}
        />
        <button 
          onClick={checkLC}
          disabled={loading || !lcId}
          style={{ 
            padding: 10, 
            marginRight: 10,
            fontSize: 16,
            backgroundColor: (loading || !lcId) ? '#444' : '#666',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: (loading || !lcId) ? 'not-allowed' : 'pointer'
          }}
        >
          Check LC
        </button>
        <button 
          onClick={confirmShipment}
          disabled={loading || !lcId || !lcInfo?.canShip}
          style={{ 
            padding: 10,
            fontSize: 16,
            backgroundColor: (loading || !lcId || !lcInfo?.canShip) ? '#444' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: (loading || !lcId || !lcInfo?.canShip) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? "Processing..." : "Confirm Shipment"}
        </button>
      </div>

      {lcInfo && (
        <div style={{ 
          padding: 20, 
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
          border: '1px solid #333',
          marginBottom: 20
        }}>
          <h3>📋 LC Information</h3>
          <p><strong>Product ID:</strong> {lcInfo.productId}</p>
          <p><strong>Buyer:</strong> {lcInfo.buyer}</p>
          <p><strong>Seller (You):</strong> {lcInfo.seller}</p>
          <p><strong>Bank:</strong> {lcInfo.bank}</p>
          <p><strong>Amount:</strong> {lcInfo.amount} mUSD</p>
          <p style={{ 
            color: lcInfo.canShip ? '#10b981' : '#f59e0b',
            fontWeight: 'bold'
          }}>
            <strong>Status:</strong> {lcInfo.statusName}
          </p>
          
          {!lcInfo.isExporter && (
            <p style={{ color: '#ef4444', fontWeight: 'bold' }}>
              ⚠️ You are not the exporter for this LC
            </p>
          )}
          
          {!lcInfo.canShip && lcInfo.status === 0 && (
            <p style={{ color: '#f59e0b' }}>
              ⏳ Waiting for Bank approval...
            </p>
          )}
          
          {!lcInfo.canShip && lcInfo.status >= 2 && (
            <p style={{ color: '#6b7280' }}>
              ✅ Shipment already confirmed
            </p>
          )}
        </div>
      )}

      {error && (
        <div style={{ 
          padding: 20, 
          backgroundColor: '#fee', 
          color: '#c00',
          borderRadius: 8,
          marginBottom: 20
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: 20, 
          backgroundColor: '#efe', 
          color: '#060',
          borderRadius: 8,
          marginBottom: 20,
          wordBreak: 'break-all'
        }}>
          {success}
        </div>
      )}

      <div style={{ 
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3>📖 Instructions</h3>
        <ol>
          <li>Switch to <strong>Exporter account</strong> in MetaMask</li>
          <li>Enter the LC ID</li>
          <li>Click "Check LC" to verify status</li>
          <li>LC must be <strong>APPROVED</strong> by Bank</li>
          <li>Click "Confirm Shipment" to ship goods</li>
        </ol>
        <p style={{ color: '#10b981', marginTop: 15 }}>
          ✅ After shipment → Logistics can mark delivery
        </p>
      </div>
    </div>
  );
}
