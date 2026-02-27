"use client";
import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "@/lib/ethers";
import { getLCContract, getSupplyChainContract } from "@/lib/contracts";

export default function LogisticsMarkDelivered() {
  const [productId, setProductId] = useState("");
  const [lcId, setLcId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [lcInfo, setLcInfo] = useState<any>(null);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [showProducts, setShowProducts] = useState(false);

  const STATUS_NAMES = ["OPENED", "APPROVED", "SHIPPED", "DELIVERED_PENDING", "DELIVERED_CONFIRMED", "UNDER_REVIEW", "PAID", "CANCELLED"];
  const PRODUCT_STATUS = ["Created", "Delivered", "Received"];

  // Load available products
  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const signer = await getSigner();
      const supplyChain = getSupplyChainContract(signer);
      
      const productCount = await supplyChain.productCount();
      const count = Number(productCount);
      
      console.log("Total products:", count);
      
      const products = [];
      
      for (let i = 0; i < count; i++) {
        try {
          const product = await supplyChain.products(i);
          
          if (product && product.name && product.name !== "") {
            products.push({
              id: i,
              name: product.name,
              importer: product.importer,
              status: Number(product.status),
              statusName: PRODUCT_STATUS[Number(product.status)],
              canDeliver: Number(product.status) === 0
            });
          }
        } catch (err) {
          console.log(`Product ${i} error:`, err);
        }
      }
      
      setAvailableProducts(products);
      setShowProducts(true);
      
      if (products.length === 0) {
        setError("No products found. Create products using Importer role first.");
      }
      
    } catch (err: any) {
      console.error("Load error:", err);
      setError(`Failed to load: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  // Validate product exists
  async function validateProductExists(signer: any, prodId: string): Promise<boolean> {
    try {
      const supplyChain = getSupplyChainContract(signer);
      const product = await supplyChain.products(prodId);
      
      if (!product || product.name === "") {
        return false;
      }
      return true;
    } catch (err: any) {
      if (err.message?.includes("Product not exist")) {
        return false;
      }
      throw err;
    }
  }

  // Check status
  async function checkStatus() {
    if (!productId && !lcId) {
      setError("❌ Please enter Product ID or LC ID");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);
      setProductInfo(null);
      setLcInfo(null);

      const signer = await getSigner();

      // Check Product
      if (productId) {
        const productExists = await validateProductExists(signer, productId);
        
        if (!productExists) {
          setError(`❌ Product #${productId} does not exist! Product ID starts from 0.`);
          setLoading(false);
          return;
        }

        const supplyChain = getSupplyChainContract(signer);
        const product = await supplyChain.products(productId);
        
        setProductInfo({
          id: productId,
          name: product.name,
          importer: product.importer,
          status: Number(product.status),
          statusName: PRODUCT_STATUS[Number(product.status)],
          canMarkDelivered: Number(product.status) === 0
        });
      }

      // Check LC
      if (lcId) {
        const lc = getLCContract(signer);
        const lcData = await lc.lcs(lcId);

        if (lcData.buyer === "0x0000000000000000000000000000000000000000") {
          setError(`❌ LC #${lcId} does not exist!`);
          setLoading(false);
          return;
        }

        setLcInfo({
          id: lcId,
          productId: lcData.productId.toString(),
          buyer: lcData.buyer,
          seller: lcData.seller,
          bank: lcData.bank,
          amount: ethers.formatEther(lcData.amount),
          status: Number(lcData.status),
          statusName: STATUS_NAMES[Number(lcData.status)],
          canMarkDelivered: Number(lcData.status) === 2
        });

        // Auto-fill product ID
        if (!productId) {
          const prodId = lcData.productId.toString();
          setProductId(prodId);
          
          const productExists = await validateProductExists(signer, prodId);
          if (productExists) {
            const supplyChain = getSupplyChainContract(signer);
            const product = await supplyChain.products(prodId);
            
            setProductInfo({
              id: prodId,
              name: product.name,
              importer: product.importer,
              status: Number(product.status),
              statusName: PRODUCT_STATUS[Number(product.status)],
              canMarkDelivered: Number(product.status) === 0
            });
          }
        }
      }

    } catch (err: any) {
      console.error("Check error:", err);
      setError(err.reason || err.message || "Failed to check status");
    } finally {
      setLoading(false);
    }
  }

  // Step 1
  async function markProductDelivered() {
    if (!productId) {
      setError("❌ Please enter Product ID");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const supplyChain = getSupplyChainContract(signer);

      const tx = await supplyChain.markDelivered(productId);
      console.log("TX:", tx.hash);
      
      setSuccess(`⏳ Transaction sent: ${tx.hash}`);
      
      await tx.wait();

      setSuccess(`✅ Step 1 Complete! Product #${productId} marked as Delivered`);
      setStep1Done(true);

      await checkStatus();

    } catch (err: any) {
      console.error("Step 1 error:", err);
      
      let errorMsg = "Transaction failed";
      
      if (err.message?.includes("Wrong role")) {
        errorMsg = "❌ Only Logistics role can mark delivered";
      } else if (err.message?.includes("Invalid state")) {
        errorMsg = "❌ Product must be in Created status";
      } else if (err.reason) {
        errorMsg = `❌ ${err.reason}`;
      } else if (err.message) {
        errorMsg = `❌ ${err.message}`;
      }
      
      setError(errorMsg);
      
    } finally {
      setLoading(false);
    }
  }

  // Step 2
  async function markLCDeliveredPending() {
    if (!lcId) {
      setError("❌ Please enter LC ID");
      return;
    }

    if (!step1Done) {
      setError("❌ Please complete Step 1 first");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      const tx = await lc.markDeliveredPending(lcId);
      console.log("TX:", tx.hash);
      
      setSuccess(`⏳ Transaction sent: ${tx.hash}`);
      
      await tx.wait();

      setSuccess(`✅ Step 2 Complete! LC #${lcId} marked as DELIVERED_PENDING\n\n➡️ Next: Importer confirms delivery`);
      setStep2Done(true);

      await checkStatus();

    } catch (err: any) {
      console.error("Step 2 error:", err);
      
      let errorMsg = "Transaction failed";
      
      if (err.message?.includes("Only Logistics")) {
        errorMsg = "❌ Only Logistics role can mark delivered pending";
      } else if (err.message?.includes("Not shipped")) {
        errorMsg = "❌ LC must be SHIPPED first";
      } else if (err.reason) {
        errorMsg = `❌ ${err.reason}`;
      } else if (err.message) {
        errorMsg = `❌ ${err.message}`;
      }
      
      setError(errorMsg);
      
    } finally {
      setLoading(false);
    }
  }

  // Quick complete
  async function completeAllSteps() {
    if (!productId || !lcId) {
      setError("❌ Please enter both Product ID and LC ID");
      return;
    }

    await markProductDelivered();
    
    if (step1Done) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await markLCDeliveredPending();
    }
  }

  return (
    <div style={{ 
      padding: 40,
      maxWidth: 800,
      margin: '0 auto',
      color: '#fff',
      backgroundColor: '#000',
      minHeight: '100vh'
    }}>
      <h1>🚚 Logistics – Mark Delivered</h1>

      {/* Load Products */}
      <div style={{
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        border: '1px solid #333',
        marginBottom: 20
      }}>
        <h3 style={{ marginTop: 0 }}>📋 Available Products</h3>
        <button
          onClick={loadProducts}
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
            backgroundColor: loading ? '#444' : '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? "Loading..." : "🔄 Load Products"}
        </button>
        
        {showProducts && (
          <div style={{ marginTop: 15, maxHeight: 300, overflowY: 'auto' }}>
            {availableProducts.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888' }}>No products found</p>
            ) : (
              availableProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setProductId(p.id.toString());
                    setStep1Done(false);
                    setStep2Done(false);
                  }}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    backgroundColor: '#111',
                    border: '1px solid #333',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ color: '#8b5cf6' }}>ID: {p.id}</strong> - {p.name}
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                        Status: {p.statusName}
                      </div>
                    </div>
                    {p.canDeliver && <span style={{ color: '#10b981' }}>✅</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        border: '1px solid #333',
        marginBottom: 20
      }}>
        <h3 style={{ marginTop: 0 }}>📝 Input</h3>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Product ID (starts from 0):
        </label>
        <input
          type="number"
          placeholder="0"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setStep1Done(false);
            setStep2Done(false);
            setProductInfo(null);
          }}
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
          LC ID:
        </label>
        <input
          type="number"
          placeholder="Enter LC ID"
          value={lcId}
          onChange={(e) => {
            setLcId(e.target.value);
            setStep1Done(false);
            setStep2Done(false);
            setLcInfo(null);
          }}
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

        <button
          onClick={checkStatus}
          disabled={loading || (!productId && !lcId)}
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
            backgroundColor: (loading || (!productId && !lcId)) ? '#444' : '#666',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: (loading || (!productId && !lcId)) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? "Checking..." : "🔍 Check Status"}
        </button>
      </div>

      {/* Status */}
      {(productInfo || lcInfo) && (
        <div style={{
          padding: 20,
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
          border: '1px solid #333',
          marginBottom: 20
        }}>
          <h3 style={{ marginTop: 0 }}>📊 Status</h3>

          {productInfo && (
            <div style={{
              padding: 15,
              backgroundColor: '#111',
              borderRadius: 4,
              marginBottom: 15
            }}>
              <h4 style={{ marginTop: 0, color: '#8b5cf6' }}>Product #{productInfo.id}</h4>
              <p><strong>Name:</strong> {productInfo.name}</p>
              <p style={{
                color: productInfo.canMarkDelivered ? '#10b981' : '#f59e0b',
                fontWeight: 'bold'
              }}>
                <strong>Status:</strong> {productInfo.statusName}
              </p>
            </div>
          )}

          {lcInfo && (
            <div style={{
              padding: 15,
              backgroundColor: '#111',
              borderRadius: 4
            }}>
              <h4 style={{ marginTop: 0, color: '#8b5cf6' }}>LC #{lcInfo.id}</h4>
              <p><strong>Product ID:</strong> {lcInfo.productId}</p>
              <p><strong>Amount:</strong> {lcInfo.amount} mUSD</p>
              <p style={{
                color: lcInfo.canMarkDelivered ? '#10b981' : '#f59e0b',
                fontWeight: 'bold'
              }}>
                <strong>Status:</strong> {lcInfo.statusName}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        border: '1px solid #333',
        marginBottom: 20
      }}>
        <h3 style={{ marginTop: 0 }}>🎯 Actions</h3>

        {/* Step 1 */}
        <div style={{
          padding: 15,
          backgroundColor: step1Done ? '#064e3b' : '#111',
          borderRadius: 4,
          marginBottom: 15,
          border: step1Done ? '2px solid #10b981' : '1px solid #333'
        }}>
          <h4 style={{ margin: 0, marginBottom: 10, color: step1Done ? '#10b981' : '#fff' }}>
            {step1Done ? '✅' : '1️⃣'} Step 1: Mark Product Delivered
          </h4>
          <button
            onClick={markProductDelivered}
            disabled={loading || !productId || step1Done}
            style={{
              width: '100%',
              padding: 12,
              fontSize: 16,
              fontWeight: 'bold',
              backgroundColor: step1Done ? '#10b981' : (loading || !productId) ? '#444' : '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: (loading || !productId || step1Done) ? 'not-allowed' : 'pointer'
            }}
          >
            {step1Done ? '✅ Complete' : loading ? 'Processing...' : 'Execute Step 1'}
          </button>
        </div>

        {/* Step 2 */}
        <div style={{
          padding: 15,
          backgroundColor: step2Done ? '#064e3b' : '#111',
          borderRadius: 4,
          marginBottom: 15,
          border: step2Done ? '2px solid #10b981' : '1px solid #333'
        }}>
          <h4 style={{ margin: 0, marginBottom: 10, color: step2Done ? '#10b981' : '#fff' }}>
            {step2Done ? '✅' : '2️⃣'} Step 2: Mark LC Delivered Pending
          </h4>
          <button
            onClick={markLCDeliveredPending}
            disabled={loading || !lcId || !step1Done || step2Done}
            style={{
              width: '100%',
              padding: 12,
              fontSize: 16,
              fontWeight: 'bold',
              backgroundColor: step2Done ? '#10b981' : (loading || !lcId || !step1Done) ? '#444' : '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: (loading || !lcId || !step1Done || step2Done) ? 'not-allowed' : 'pointer'
            }}
          >
            {step2Done ? '✅ Complete' : loading ? 'Processing...' : 'Execute Step 2'}
          </button>
        </div>

        {/* Quick */}
        <div style={{
          padding: 15,
          backgroundColor: '#111',
          borderRadius: 4,
          border: '1px solid #f59e0b'
        }}>
          <h4 style={{ margin: 0, marginBottom: 10, color: '#f59e0b' }}>
            ⚡ Quick: Complete Both
          </h4>
          <button
            onClick={completeAllSteps}
            disabled={loading || !productId || !lcId || step1Done || step2Done}
            style={{
              width: '100%',
              padding: 12,
              fontSize: 16,
              fontWeight: 'bold',
              backgroundColor: (loading || !productId || !lcId || step1Done || step2Done) ? '#444' : '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: (loading || !productId || !lcId || step1Done || step2Done) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processing...' : '⚡ Complete Both Steps'}
          </button>
        </div>
      </div>

      {/* Error */}
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

      {/* Success */}
      {success && (
        <div style={{
          padding: 15,
          backgroundColor: '#efe',
          color: '#060',
          borderRadius: 4,
          marginBottom: 20,
          whiteSpace: 'pre-wrap'
        }}>
          {success}
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
            Switch to <strong>Logistics account</strong>: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
          </li>
          <li style={{ marginBottom: 8 }}>
            Click "Load Products" to see available products
          </li>
          <li style={{ marginBottom: 8 }}>
            Enter Product ID (starts from 0) and LC ID
          </li>
          <li style={{ marginBottom: 8 }}>
            Check status to verify
          </li>
          <li>
            Execute Step 1 then Step 2 (or use Quick button)
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
            <li>Account must have <strong>Logistics</strong> role</li>
            <li>Product must be in <strong>Created</strong> status (0)</li>
            <li>LC must be in <strong>SHIPPED</strong> status (2)</li>
          </ul>
        </div>

        <p style={{ color: '#8b5cf6', marginTop: 15, marginBottom: 0, fontWeight: 'bold' }}>
          ✅ After delivery → Importer/Bank confirms → Payment released
        </p>
      </div>
    </div>
  );
}
