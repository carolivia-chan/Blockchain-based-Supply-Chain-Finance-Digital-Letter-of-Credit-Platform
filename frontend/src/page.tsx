"use client";
import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "@/lib/ethers";
import { getLCContract, getSupplyChainContract } from "@/lib/contracts";

export default function OpenLCPage() {
  const [productId, setProductId] = useState("");
  const [seller, setSeller] = useState("0x90F79bf6EB2c4f870365E785982E1f101E93b906"); // Default Exporter
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [lcId, setLcId] = useState("");
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");

  // Create product first
  async function createProduct() {
    if (!productName) {
      setError("❌ Please enter product name");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const signer = await getSigner();
      const supplyChain = getSupplyChainContract(signer);

      console.log("Creating product:", productName);
      const tx = await supplyChain.createProduct(productName);
      const receipt = await tx.wait();

      // Extract product ID from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = supplyChain.interface.parseLog(log);
          return parsed?.name === "ProductCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = supplyChain.interface.parseLog(event);
        const newProductId = parsed?.args[0].toString();
        setProductId(newProductId);
        alert(`✅ Product created! ID: ${newProductId}`);
      }

    } catch (err: any) {
      console.error("Create product error:", err);
      const errorMsg = err.message?.includes("Only Importer")
        ? "❌ Only Importer role can create products"
        : err.reason || err.message;
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function openLC() {
    // Validation
    if (!productId) {
      setError("❌ Please enter or create Product ID first");
      return;
    }
    if (!seller) {
      setError("❌ Please enter Exporter address");
      return;
    }
    if (!ethers.isAddress(seller)) {
      setError("❌ Invalid Exporter address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("❌ Please enter valid amount");
      return;
    }

    try {
      setError("");
      setTxHash("");
      setLcId("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      console.log("Opening LC:");
      console.log("- Product ID:", productId);
      console.log("- Seller:", seller);
      console.log("- Amount:", amount, "mUSD");

      const tx = await lc.openLC(
        Number(productId),
        seller,
        ethers.parseUnits(amount, 18)
      );

      setTxHash(tx.hash);
      console.log("Transaction sent:", tx.hash);

      const receipt = await tx.wait();
      console.log("Transaction confirmed");

      // Extract LC ID from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = lc.interface.parseLog(log);
          return parsed?.name === "LCCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = lc.interface.parseLog(event);
        const newLcId = parsed?.args[0].toString();
        setLcId(newLcId);
        console.log("LC ID:", newLcId);
        alert(`✅ LC opened successfully!\nLC ID: ${newLcId}\n\nNext: Bank needs to approve LC #${newLcId}`);
      } else {
        alert("✅ LC opened successfully!");
      }

    } catch (err: any) {
      console.error("Open LC error:", err);
      
      let errorMsg = "Transaction failed";
      
      if (err.message?.includes("Only Importer")) {
        errorMsg = "❌ Only accounts with Importer role can open LC";
      } else if (err.message?.includes("Seller not Exporter")) {
        errorMsg = "❌ Seller address must have Exporter role";
      } else if (err.reason) {
        errorMsg = `❌ ${err.reason}`;
      } else if (err.message) {
        errorMsg = `❌ ${err.message}`;
      }
      
      setError(errorMsg);
      alert(errorMsg);
      
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      padding: 40,
      maxWidth: 700,
      margin: '0 auto',
      color: '#fff',
      backgroundColor: '#000',
      minHeight: '100vh'
    }}>
      <h1>📄 Open Letter of Credit</h1>

      {/* Step 1: Create Product */}
      <div style={{
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        border: '1px solid #333',
        marginBottom: 20
      }}>
        <h3 style={{ marginTop: 0 }}>Step 1: Create Product (Optional)</h3>
        <p style={{ fontSize: 14, color: '#888' }}>
          If you don't have a product yet, create one here
        </p>
        
        <input
          placeholder="Product Name (e.g. Steel Coil A)"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
            marginBottom: 10,
            backgroundColor: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 4
          }}
        />
        
        <button 
          onClick={createProduct}
          disabled={loading || !productName}
          style={{
            padding: 10,
            fontSize: 16,
            backgroundColor: (loading || !productName) ? '#444' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: (loading || !productName) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? "Creating..." : "Create Product"}
        </button>

        {productId && (
          <p style={{ 
            marginTop: 10, 
            padding: 10, 
            backgroundColor: '#111',
            borderRadius: 4,
            color: '#10b981'
          }}>
            ✅ Product ID: <strong>{productId}</strong>
          </p>
        )}
      </div>

      {/* Step 2: Open LC */}
      <div style={{
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        border: '1px solid #333',
        marginBottom: 20
      }}>
        <h3 style={{ marginTop: 0 }}>Step 2: Open Letter of Credit</h3>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Product ID:
        </label>
        <input
          type="number"
          placeholder="0"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
            marginBottom: 15,
            backgroundColor: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 4
          }}
        />

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Exporter Address:
        </label>
        <input
          placeholder="0x..."
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
            marginBottom: 5,
            backgroundColor: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 14
          }}
        />
        <small style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 15 }}>
          Default: Hardhat Account #3 (Exporter)
        </small>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Amount (mUSD):
        </label>
        <input
          type="number"
          placeholder="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
            marginBottom: 20,
            backgroundColor: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 4
          }}
        />

        <button 
          onClick={openLC}
          disabled={loading || !productId || !seller || !amount}
          style={{
            width: '100%',
            padding: 15,
            fontSize: 18,
            fontWeight: 'bold',
            backgroundColor: (loading || !productId || !seller || !amount) ? '#444' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: (loading || !productId || !seller || !amount) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? "⏳ Opening LC..." : "🚀 Open LC"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: 15,
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: 4,
          marginBottom: 20,
          whiteSpace: 'pre-wrap'
        }}>
          {error}
        </div>
      )}

      {/* Success Display */}
      {txHash && (
        <div style={{
          padding: 20,
          backgroundColor: '#efe',
          color: '#060',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <h3 style={{ marginTop: 0, color: '#060' }}>✅ LC Opened Successfully!</h3>
          
          {lcId && (
            <p style={{ margin: '10px 0', fontSize: 18 }}>
              <strong>LC ID: {lcId}</strong>
            </p>
          )}
          
          <p style={{ margin: '5px 0', fontSize: 14 }}>
            <strong>Product:</strong> {productId}
          </p>
          <p style={{ margin: '5px 0', fontSize: 14 }}>
            <strong>Seller:</strong> {seller.slice(0, 10)}...
          </p>
          <p style={{ margin: '5px 0', fontSize: 14 }}>
            <strong>Amount:</strong> {amount} mUSD
          </p>
          
          <p style={{ 
            margin: '15px 0 5px 0', 
            fontSize: 12, 
            wordBreak: 'break-all',
            color: '#444'
          }}>
            <strong>TX Hash:</strong> {txHash}
          </p>

          <div style={{
            marginTop: 15,
            padding: 10,
            backgroundColor: '#dfd',
            borderRadius: 4,
            color: '#060'
          }}>
            <strong>📌 Next Step:</strong> Switch to Bank account and approve LC #{lcId}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        border: '1px solid #333'
      }}>
        <h3 style={{ marginTop: 0 }}>📖 Instructions</h3>
        <ol style={{ fontSize: 14, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>
            Switch MetaMask to <strong>Importer account</strong>:
            <code style={{
              display: 'block',
              padding: 8,
              marginTop: 5,
              backgroundColor: '#111',
              borderRadius: 4,
              fontSize: 12
            }}>
              0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
            </code>
          </li>
          <li style={{ marginBottom: 8 }}>
            (Optional) Create a new product or use existing Product ID
          </li>
          <li style={{ marginBottom: 8 }}>
            Enter Product ID, Exporter address, and Amount
          </li>
          <li>
            Click "Open LC" and confirm in MetaMask
          </li>
        </ol>

        <div style={{
          marginTop: 15,
          padding: 15,
          backgroundColor: '#111',
          borderRadius: 4
        }}>
          <h4 style={{ marginTop: 0, color: '#f59e0b' }}>⚠️ Requirements:</h4>
          <ul style={{ paddingLeft: 20, marginBottom: 0, fontSize: 14 }}>
            <li>Your account must have <strong>Importer</strong> role</li>
            <li>Exporter address must have <strong>Exporter</strong> role</li>
            <li>Product must exist in SupplyChain contract</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
