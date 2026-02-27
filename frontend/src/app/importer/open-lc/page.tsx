"use client";
import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "@/lib/ethers";
import { getLCContract, getSupplyChainContract, getUSDTokenContract, CONTRACTS, ACCOUNTS } from "@/lib/contracts";

type Tab = "open-lc" | "confirm-received" | "approve-musd" | "raise-dispute";

export default function ImporterDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("confirm-received");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [account, setAccount] = useState("");
  const [connected, setConnected] = useState(false);

  // Open LC states
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [seller, setSeller] = useState(ACCOUNTS.Exporter);
  const [amount, setAmount] = useState("1000");
  const [lcId, setLcId] = useState("");

  // Confirm Received states
  const [confirmProductId, setConfirmProductId] = useState("1");
  const [confirmLcId, setConfirmLcId] = useState("11");
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [lcInfo, setLcInfo] = useState<any>(null);

  // Status display - ĐÃ XÓA HOÀN TOÀN InTransit
  const PRODUCT_STATUS = ["Created", "Delivered", "Received"];
  const LC_STATUS = ["OPENED", "APPROVED", "SHIPPED", "DELIVERED_PENDING", "DELIVERED_CONFIRMED", "UNDER_REVIEW", "PAID", "CANCELLED"];

  // Approve mUSD states
  const [approveAmount, setApproveAmount] = useState("10000");
  const [balance, setBalance] = useState("");
  const [allowance, setAllowance] = useState("");

  // Dispute states
  const [disputeLcId, setDisputeLcId] = useState("");

  // ========== CONNECT WALLET ==========
  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not found! Please install MetaMask.");
      return;
    }

    try {
      setLoading(true);
      const signer = await getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setConnected(true);
      setSuccess(`✅ Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (err: any) {
      setError("Failed to connect wallet: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ========== CHECK STATUS ==========
  async function checkStatus() {
    if (!confirmProductId && !confirmLcId) {
      setError("❌ Please enter Product ID or LC ID");
      return;
    }

    try {
      setError("");
      setLoading(true);
      setProductInfo(null);
      setLcInfo(null);

      const signer = await getSigner();

      // Check Product - STATUS 1 = DELIVERED (có thể confirm ngay)
      if (confirmProductId) {
        const supplyChain = getSupplyChainContract(signer);
        const product = await supplyChain.products(confirmProductId);
        
        const statusNum = Number(product.status);
        setProductInfo({
          id: confirmProductId,
          name: product.name,
          status: statusNum,
          statusName: PRODUCT_STATUS[statusNum] || "Unknown",
          importer: product.importer,
          canConfirm: statusNum === 1 // Delivered = index 1
        });
      }

      // Check LC
      if (confirmLcId) {
        const lc = getLCContract(signer);
        const lcData = await lc.lcs(confirmLcId);

        if (lcData.buyer === "0x0000000000000000000000000000000000000000") {
          setError(`❌ LC #${confirmLcId} does not exist!`);
          setLcInfo(null);
          setLoading(false);
          return;
        }

        const lcStatusNum = Number(lcData.status);
        setLcInfo({
          id: confirmLcId,
          productId: lcData.productId.toString(),
          buyer: lcData.buyer,
          seller: lcData.seller,
          amount: ethers.formatEther(lcData.amount),
          status: lcStatusNum,
          statusName: LC_STATUS[lcStatusNum] || "Unknown",
          canConfirm: lcStatusNum === 3 // DELIVERED_PENDING
        });

        if (!confirmProductId) {
          setConfirmProductId(lcData.productId.toString());
        }
      }

      setSuccess("✅ Status loaded!");

    } catch (err: any) {
      console.error("Check error:", err);
      setError(err.message || "Failed to check status");
    } finally {
      setLoading(false);
    }
  }

  // ========== OPEN LC ==========
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

      const tx = await supplyChain.createProduct(productName);
      const receipt = await tx.wait();

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
        setSuccess(`✅ Product created! ID: ${newProductId}`);
      }
    } catch (err: any) {
      setError(err.message?.includes("Only Importer") ? "❌ Only Importer role" : err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openLC() {
    if (!productId || !seller || !amount) {
      setError("❌ Fill all fields");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      const tx = await lc.openLC(Number(productId), seller, ethers.parseUnits(amount, 18));
      const receipt = await tx.wait();

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
        setSuccess(`✅ LC opened! ID: ${newLcId}\nNext: Bank approves LC #${newLcId}`);
      }
    } catch (err: any) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  // ========== CONFIRM RECEIVED ==========
  async function confirmProductReceived() {
    if (!confirmProductId) {
      setError("❌ Please enter Product ID");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const supplyChain = getSupplyChainContract(signer);

      console.log("Confirming product:", confirmProductId);
      const tx = await supplyChain.confirmReceived(confirmProductId);
      console.log("Transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("Transaction confirmed");
      
      setSuccess(`✅ Product #${confirmProductId} confirmed as Received!`);
      setStep1Done(true);

      await checkStatus();
    } catch (err: any) {
      console.error("Error:", err);
      let errorMsg = "Transaction failed";
      
      if (err.message?.includes("Only Importer")) {
        errorMsg = "❌ Only Importer can confirm";
      } else if (err.message?.includes("Invalid state")) {
        errorMsg = "❌ Product must be Delivered first (status = 1)";
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

  async function confirmLCDelivered() {
    if (!confirmLcId) {
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

      console.log("Confirming LC delivered:", confirmLcId);
      const tx = await lc.confirmDelivered(confirmLcId);
      console.log("Transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("Transaction confirmed");
      
      setSuccess(`✅ LC #${confirmLcId} confirmed! Bank can release payment.`);
      setStep2Done(true);

      await checkStatus();
    } catch (err: any) {
      console.error("Error:", err);
      let errorMsg = "Transaction failed";
      
      if (err.message?.includes("Only Importer")) {
        errorMsg = "❌ Only Importer or Bank can confirm";
      } else if (err.message?.includes("Invalid state")) {
        errorMsg = "❌ LC must be DELIVERED_PENDING first";
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

  // ========== APPROVE mUSD ==========
  async function checkBalance() {
    try {
      setError("");
      setLoading(true);

      const signer = await getSigner();
      const usdToken = getUSDTokenContract(signer);
      const address = await signer.getAddress();

      const bal = await usdToken.balanceOf(address);
      const allow = await usdToken.allowance(address, CONTRACTS.LetterOfCredit);

      setBalance(ethers.formatEther(bal));
      setAllowance(ethers.formatEther(allow));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveMUSD() {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const usdToken = getUSDTokenContract(signer);
      const amountWei = ethers.parseUnits(approveAmount, 18);

      const tx = await usdToken.approve(CONTRACTS.LetterOfCredit, amountWei);
      await tx.wait();
      
      setSuccess(`✅ Approved ${approveAmount} mUSD for LC contract!`);
      await checkBalance();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ========== RAISE DISPUTE ==========
  async function raiseDispute() {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      const tx = await lc.raiseDispute(disputeLcId);
      await tx.wait();
      
      setSuccess(`✅ Dispute raised for LC #${disputeLcId}!\nStatus: UNDER_REVIEW\nBank will resolve.`);
    } catch (err: any) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: "open-lc", label: "📄 Open LC", color: "#10b981" },
    { id: "confirm-received", label: "📦 Confirm Received", color: "#3b82f6" },
    { id: "approve-musd", label: "💰 Approve mUSD", color: "#f59e0b" },
    { id: "raise-dispute", label: "⚠️ Raise Dispute", color: "#ef4444" }
  ];

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: '0 auto', color: '#fff', backgroundColor: '#000', minHeight: '100vh' }}>
      <h1>📋 Importer Dashboard</h1>
      
      {!connected ? (
        <div style={{ padding: 30, backgroundColor: '#1a1a1a', borderRadius: 8, border: '1px solid #333', textAlign: 'center' }}>
          <h2>Connect Your Wallet</h2>
          <p style={{ color: '#888', marginBottom: 20 }}>
            Please connect to Importer account:<br/>
            <code style={{ fontSize: 12 }}>{ACCOUNTS.Importer}</code>
          </p>
          <button
            onClick={connectWallet}
            disabled={loading}
            style={{
              padding: '15px 30px',
              fontSize: 18,
              fontWeight: 'bold',
              backgroundColor: loading ? '#444' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Connecting...' : '🦊 Connect MetaMask'}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <p style={{ color: '#888' }}>
              Connected: <code style={{ color: '#10b981' }}>{account.slice(0, 6)}...{account.slice(-4)}</code>
            </p>
            <button
              onClick={() => setConnected(false)}
              style={{
                padding: '8px 15px',
                fontSize: 14,
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Disconnect
            </button>
          </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as Tab);
              setError("");
              setSuccess("");
            }}
            style={{
              padding: '10px 20px',
              fontSize: 16,
              fontWeight: 'bold',
              backgroundColor: activeTab === tab.id ? tab.color : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 15, backgroundColor: '#fee', color: '#c00', borderRadius: 4, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: 15, backgroundColor: '#efe', color: '#060', borderRadius: 4, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
          {success}
        </div>
      )}

      <div style={{ padding: 30, backgroundColor: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
        
        {activeTab === "confirm-received" && (
          <>
            <h2 style={{ marginTop: 0 }}>📦 Confirm Received</h2>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Product ID:</label>
              <input 
                placeholder="Product ID" 
                type="number" 
                value={confirmProductId} 
                onChange={(e) => {
                  setConfirmProductId(e.target.value);
                  setProductInfo(null);
                  setStep1Done(false);
                  setStep2Done(false);
                }} 
                style={{ width: '100%', padding: 12, marginBottom: 10, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} 
              />
              
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>LC ID:</label>
              <input 
                placeholder="LC ID" 
                type="number" 
                value={confirmLcId} 
                onChange={(e) => {
                  setConfirmLcId(e.target.value);
                  setLcInfo(null);
                  setStep1Done(false);
                  setStep2Done(false);
                }} 
                style={{ width: '100%', padding: 12, marginBottom: 15, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} 
              />
              
              <button
                onClick={checkStatus}
                disabled={loading || (!confirmProductId && !confirmLcId)}
                style={{
                  width: '100%',
                  padding: 12,
                  backgroundColor: loading ? '#444' : '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: (loading || (!confirmProductId && !confirmLcId)) ? 'not-allowed' : 'pointer',
                  marginBottom: 20
                }}
              >
                {loading ? "Checking..." : "🔍 Check Status"}
              </button>
            </div>

            {(productInfo || lcInfo) && (
              <div style={{
                padding: 20,
                backgroundColor: '#111',
                borderRadius: 8,
                marginBottom: 20,
                border: '1px solid #444'
              }}>
                <h3 style={{ marginTop: 0, color: '#8b5cf6' }}>📊 Current Status</h3>

                {productInfo && (
                  <div style={{
                    padding: 15,
                    backgroundColor: '#1a1a1a',
                    borderRadius: 4,
                    marginBottom: lcInfo ? 15 : 0
                  }}>
                    <h4 style={{ marginTop: 0, color: '#3b82f6' }}>Product #{productInfo.id}</h4>
                    <p><strong>Name:</strong> {productInfo.name}</p>
                    <p style={{
                      color: productInfo.canConfirm ? '#10b981' : '#f59e0b',
                      fontWeight: 'bold'
                    }}>
                      <strong>Status:</strong> {productInfo.statusName} (index: {productInfo.status})
                    </p>
                    {productInfo.status === 0 && (
                      <p style={{ color: '#f59e0b', fontSize: 14 }}>
                        ⚠️ Product is Created. Waiting for Logistics to mark as Delivered (status = 1)
                      </p>
                    )}
                    {productInfo.status === 1 && (
                      <p style={{ color: '#10b981', fontSize: 14 }}>
                        ✅ Ready to confirm! Product is Delivered (status = 1)
                      </p>
                    )}
                    {productInfo.status >= 2 && (
                      <p style={{ color: '#10b981', fontSize: 14 }}>
                        ✅ Already received (status = {productInfo.status})
                      </p>
                    )}
                  </div>
                )}

                {lcInfo && (
                  <div style={{
                    padding: 15,
                    backgroundColor: '#1a1a1a',
                    borderRadius: 4
                  }}>
                    <h4 style={{ marginTop: 0, color: '#3b82f6' }}>LC #{lcInfo.id}</h4>
                    <p><strong>Product ID:</strong> {lcInfo.productId}</p>
                    <p><strong>Amount:</strong> {lcInfo.amount} mUSD</p>
                    <p style={{
                      color: lcInfo.canConfirm ? '#10b981' : '#f59e0b',
                      fontWeight: 'bold'
                    }}>
                      <strong>Status:</strong> {lcInfo.statusName} (index: {lcInfo.status})
                    </p>
                    {lcInfo.status < 3 && (
                      <p style={{ color: '#f59e0b', fontSize: 14 }}>
                        ⚠️ Waiting for delivery. Current status: {lcInfo.statusName}. Needs DELIVERED_PENDING (status = 3)
                      </p>
                    )}
                    {lcInfo.status === 3 && (
                      <p style={{ color: '#10b981', fontSize: 14 }}>
                        ✅ Ready to confirm! LC is DELIVERED_PENDING (status = 3)
                      </p>
                    )}
                    {lcInfo.status >= 4 && (
                      <p style={{ color: '#10b981', fontSize: 14 }}>
                        ✅ Already confirmed (status = {lcInfo.status})
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div style={{ padding: 15, backgroundColor: step1Done ? '#064e3b' : '#111', borderRadius: 4, marginBottom: 10, border: step1Done ? '2px solid #10b981' : '1px solid #333' }}>
              <h4 style={{ margin: 0, marginBottom: 10 }}>{step1Done ? '✅' : '1️⃣'} Confirm Product Received</h4>
              <p style={{ fontSize: 13, color: '#999', marginBottom: 10 }}>
                Product must be in Delivered status (status = 1)
              </p>
              <button 
                onClick={confirmProductReceived} 
                disabled={loading || step1Done || !productInfo?.canConfirm} 
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  backgroundColor: step1Done ? '#10b981' : (loading || !productInfo?.canConfirm) ? '#444' : '#3b82f6', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: (loading || step1Done || !productInfo?.canConfirm) ? 'not-allowed' : 'pointer' 
                }}>
                {step1Done ? '✅ Done' : loading ? 'Processing...' : 'Confirm Product'}
              </button>
            </div>

            <div style={{ padding: 15, backgroundColor: step2Done ? '#064e3b' : '#111', borderRadius: 4, border: step2Done ? '2px solid #10b981' : '1px solid #333' }}>
              <h4 style={{ margin: 0, marginBottom: 10 }}>{step2Done ? '✅' : '2️⃣'} Confirm LC Delivered</h4>
              <p style={{ fontSize: 13, color: '#999', marginBottom: 10 }}>
                LC must be in DELIVERED_PENDING status (status = 3)
              </p>
              <button 
                onClick={confirmLCDelivered} 
                disabled={loading || !step1Done || step2Done || !lcInfo?.canConfirm} 
                style={{ 
                  width: '100%', 
                  padding: 12, 
                  backgroundColor: step2Done ? '#10b981' : (loading || !step1Done || !lcInfo?.canConfirm) ? '#444' : '#3b82f6', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: (loading || !step1Done || step2Done || !lcInfo?.canConfirm) ? 'not-allowed' : 'pointer' 
                }}>
                {step2Done ? '✅ Done' : loading ? 'Processing...' : 'Confirm LC'}
              </button>
            </div>
          </>
        )}

        {activeTab === "open-lc" && (
          <>
            <h2 style={{ marginTop: 0 }}>📄 Open Letter of Credit</h2>
            
            <h3>Step 1: Create Product</h3>
            <input
              placeholder="Product Name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              style={{ width: '100%', padding: 12, marginBottom: 10, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }}
            />
            <button onClick={createProduct} disabled={loading} style={{ padding: 10, marginBottom: 20, backgroundColor: loading ? '#444' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}>
              Create Product
            </button>

            <h3>Step 2: Open LC</h3>
            <input placeholder="Product ID" type="number" value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 10, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} />
            <input placeholder="Exporter Address" value={seller} onChange={(e) => setSeller(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 10, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4, fontFamily: 'monospace', fontSize: 14 }} />
            <input placeholder="Amount (mUSD)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} />
            <button onClick={openLC} disabled={loading} style={{ width: '100%', padding: 15, fontSize: 18, fontWeight: 'bold', backgroundColor: loading ? '#444' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Opening...' : '🚀 Open LC'}
            </button>
            {lcId && <p style={{ marginTop: 15, color: '#10b981' }}>✅ LC ID: <strong>{lcId}</strong></p>}
          </>
        )}

        {activeTab === "approve-musd" && (
          <>
            <h2 style={{ marginTop: 0 }}>💰 Approve mUSD</h2>
            
            <button onClick={checkBalance} disabled={loading} style={{ padding: 10, marginBottom: 15, backgroundColor: loading ? '#444' : '#666', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}>
              Check Balance
            </button>

            {balance && (
              <div style={{ padding: 15, backgroundColor: '#111', borderRadius: 4, marginBottom: 15 }}>
                <p><strong>Balance:</strong> {balance} mUSD</p>
                <p><strong>Allowance:</strong> {allowance} mUSD</p>
              </div>
            )}

            <input placeholder="Amount to Approve" type="number" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} />
            <button onClick={approveMUSD} disabled={loading} style={{ width: '100%', padding: 15, fontSize: 18, fontWeight: 'bold', backgroundColor: loading ? '#444' : '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Approving...' : 'Approve mUSD'}
            </button>
            <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>Required before Bank can release payment</p>
          </>
        )}

        {activeTab === "raise-dispute" && (
          <>
            <h2 style={{ marginTop: 0 }}>⚠️ Raise Dispute</h2>
            
            <input placeholder="LC ID" type="number" value={disputeLcId} onChange={(e) => setDisputeLcId(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} />
            <button onClick={raiseDispute} disabled={loading} style={{ width: '100%', padding: 15, fontSize: 18, fontWeight: 'bold', backgroundColor: loading ? '#444' : '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Raising...' : '⚠️ Raise Dispute'}
            </button>
            <p style={{ fontSize: 14, color: '#f59e0b', marginTop: 15 }}>
              ⚠️ Use if you find issues with the delivery.<br/>
              LC will be marked UNDER_REVIEW and Bank will resolve.
            </p>
          </>
        )}
      </div>
    </>
      )}
    </div>
  );
}
