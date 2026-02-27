"use client";
import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "@/lib/ethers";
import { getLCContract, getUSDTokenContract } from "@/lib/contracts";

type Tab = "approve-lc" | "release-payment" | "resolve-dispute";

export default function BankDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("approve-lc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Approve LC states
  const [approveLcId, setApproveLcId] = useState("");
  const [approveLcInfo, setApproveLcInfo] = useState<any>(null);

  // Release Payment states
  const [paymentLcId, setPaymentLcId] = useState("");
  const [paymentLcInfo, setPaymentLcInfo] = useState<any>(null);

  // Resolve Dispute states
  const [disputeLcId, setDisputeLcId] = useState("");
  const [disputeLcInfo, setDisputeLcInfo] = useState<any>(null);

  const STATUS_NAMES = ["OPENED", "APPROVED", "SHIPPED", "DELIVERED_PENDING", "DELIVERED_CONFIRMED", "UNDER_REVIEW", "PAID", "CANCELLED"];

  // ========== APPROVE LC ==========
  async function checkApproveLC() {
    try {
      setError("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      const lcData = await lc.lcs(approveLcId);
      const BANK_APPROVAL_DEADLINE = await lc.BANK_APPROVAL_DEADLINE();
      
      const openedAt = Number(lcData.openedAt);
      const deadline = openedAt + Number(BANK_APPROVAL_DEADLINE);
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = deadline - now;

      setApproveLcInfo({
        productId: lcData.productId.toString(),
        buyer: lcData.buyer,
        seller: lcData.seller,
        amount: ethers.formatEther(lcData.amount),
        status: Number(lcData.status),
        statusName: STATUS_NAMES[Number(lcData.status)],
        openedAt: new Date(openedAt * 1000).toLocaleString(),
        deadline: new Date(deadline * 1000).toLocaleString(),
        timeLeft: timeLeft,
        isExpired: timeLeft < 0,
        canApprove: Number(lcData.status) === 0 && timeLeft > 0
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveLC() {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      // Check deadline
      const lcData = await lc.lcs(approveLcId);
      const BANK_APPROVAL_DEADLINE = await lc.BANK_APPROVAL_DEADLINE();
      const deadline = Number(lcData.openedAt) + Number(BANK_APPROVAL_DEADLINE);
      const now = Math.floor(Date.now() / 1000);

      if (now > deadline) {
        const daysLate = Math.floor((now - deadline) / 86400);
        setError(`❌ Deadline passed by ${daysLate} day(s)!`);
        setLoading(false);
        return;
      }

      const tx = await lc.approveLC(approveLcId);
      await tx.wait();
      
      setSuccess(`✅ LC #${approveLcId} approved!\nStatus: APPROVED\nNext: Exporter ships goods`);
      await checkApproveLC();

    } catch (err: any) {
      setError(err.message?.includes("Approval SLA missed") 
        ? "❌ Approval deadline passed (3 days)" 
        : err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  // ========== RELEASE PAYMENT ==========
  async function checkPaymentLC() {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

    // 🔎 DEBUG SELECTOR
      const fragment = lc.interface.getFunction("releasePayment");
      console.log("FRONTEND selector:", fragment.selector);

      const usdToken = getUSDTokenContract(signer);
      const lcData = await lc.lcs(paymentLcId);
      
      const buyerBalance = await usdToken.balanceOf(lcData.buyer);
      const allowance = await usdToken.allowance(lcData.buyer, await lc.getAddress());
      
      setPaymentLcInfo({
        productId: lcData.productId.toString(),
        buyer: lcData.buyer,
        seller: lcData.seller,
        amount: ethers.formatEther(lcData.amount),
        amountRaw: lcData.amount,
        status: Number(lcData.status),
        statusName: STATUS_NAMES[Number(lcData.status)],
        canPay: Number(lcData.status) === 4,
        buyerBalance: ethers.formatEther(buyerBalance),
        allowance: ethers.formatEther(allowance),
        hasEnoughBalance: buyerBalance >= lcData.amount,
        hasEnoughAllowance: allowance >= lcData.amount
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function releasePayment() {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      if (!paymentLcInfo?.hasEnoughAllowance) {
        setError("❌ Buyer hasn't approved sufficient mUSD!");
        setLoading(false);
        return;
      }

      const tx = await lc.releasePayment(paymentLcId);
      await tx.wait();
      
      setSuccess(`✅ Payment released!\n${paymentLcInfo.amount} mUSD transferred\nFrom: ${paymentLcInfo.buyer.slice(0,10)}...\nTo: ${paymentLcInfo.seller.slice(0,10)}...\n\nLC Status: PAID ✅`);
      await checkPaymentLC();

    } catch (err: any) {
      setError(err.message?.includes("Transfer failed") 
        ? "❌ Transfer failed! Check buyer balance & allowance" 
        : err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  // ========== RESOLVE DISPUTE ==========
  async function checkDisputeLC() {
    try {
      setError("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      const lcData = await lc.lcs(disputeLcId);
      
      setDisputeLcInfo({
        productId: lcData.productId.toString(),
        buyer: lcData.buyer,
        seller: lcData.seller,
        amount: ethers.formatEther(lcData.amount),
        status: Number(lcData.status),
        statusName: STATUS_NAMES[Number(lcData.status)],
        disputeRaised: lcData.disputeRaised,
        canResolve: Number(lcData.status) === 5 // UNDER_REVIEW
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resolveDispute(approve: boolean) {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const signer = await getSigner();
      const lc = getLCContract(signer);

      const tx = await lc.resolveDispute(disputeLcId, approve);
      await tx.wait();
      
      setSuccess(
        approve 
          ? `✅ Dispute resolved: APPROVED\nLC #${disputeLcId} status: DELIVERED_CONFIRMED\nYou can now release payment.`
          : `❌ Dispute resolved: REJECTED\nLC #${disputeLcId} status: CANCELLED`
      );
      await checkDisputeLC();

    } catch (err: any) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: "approve-lc", label: "✅ Approve LC", color: "#10b981" },
    { id: "release-payment", label: "💰 Release Payment", color: "#3b82f6" },
    { id: "resolve-dispute", label: "⚖️ Resolve Dispute", color: "#f59e0b" }
  ];

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: '0 auto', color: '#fff', backgroundColor: '#000', minHeight: '100vh' }}>
      <h1>🏦 Bank Dashboard</h1>
      <p style={{ color: '#888', marginBottom: 30 }}>Account: 0x7099...79C8</p>

      {/* Tabs */}
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

      {/* Error/Success */}
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

      {/* Tab Content */}
      <div style={{ padding: 30, backgroundColor: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
        
        {/* APPROVE LC */}
        {activeTab === "approve-lc" && (
          <>
            <h2 style={{ marginTop: 0 }}>✅ Approve Letter of Credit</h2>
            
            <input 
              placeholder="LC ID" 
              type="number" 
              value={approveLcId} 
              onChange={(e) => setApproveLcId(e.target.value)} 
              style={{ width: '100%', padding: 12, marginBottom: 10, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} 
            />
            
            <button 
              onClick={checkApproveLC} 
              disabled={loading || !approveLcId} 
              style={{ padding: 10, marginBottom: 20, marginRight: 10, backgroundColor: loading ? '#444' : '#666', color: '#fff', border: 'none', borderRadius: 4, cursor: (loading || !approveLcId) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Checking...' : '🔍 Check LC'}
            </button>

            {approveLcInfo && (
              <div style={{ padding: 15, backgroundColor: approveLcInfo.isExpired ? '#fee' : '#111', borderRadius: 4, marginBottom: 15, border: `1px solid ${approveLcInfo.isExpired ? '#f87171' : '#333'}` }}>
                <p><strong>Product ID:</strong> {approveLcInfo.productId}</p>
                <p><strong>Buyer:</strong> <code style={{ fontSize: 12 }}>{approveLcInfo.buyer}</code></p>
                <p><strong>Seller:</strong> <code style={{ fontSize: 12 }}>{approveLcInfo.seller}</code></p>
                <p><strong>Amount:</strong> {approveLcInfo.amount} mUSD</p>
                <p style={{ color: approveLcInfo.canApprove ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                  <strong>Status:</strong> {approveLcInfo.statusName}
                </p>
                <p><strong>Opened:</strong> {approveLcInfo.openedAt}</p>
                <p><strong>Deadline:</strong> {approveLcInfo.deadline}</p>
                {approveLcInfo.isExpired ? (
                  <p style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️ EXPIRED!</p>
                ) : (
                  <p style={{ color: '#10b981' }}>✅ Time Left: {Math.floor(approveLcInfo.timeLeft / 3600)}h {Math.floor((approveLcInfo.timeLeft % 3600) / 60)}m</p>
                )}
              </div>
            )}

            <button 
              onClick={approveLC} 
              disabled={loading || !approveLcId || !approveLcInfo?.canApprove} 
              style={{ width: '100%', padding: 15, fontSize: 18, fontWeight: 'bold', backgroundColor: (loading || !approveLcId || !approveLcInfo?.canApprove) ? '#444' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: (loading || !approveLcId || !approveLcInfo?.canApprove) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Approving...' : '✅ Approve LC'}
            </button>
            <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>Must approve within 3 days of LC opening</p>
          </>
        )}

        {/* RELEASE PAYMENT */}
        {activeTab === "release-payment" && (
          <>
            <h2 style={{ marginTop: 0 }}>💰 Release Payment</h2>
            
            <input 
              placeholder="LC ID" 
              type="number" 
              value={paymentLcId} 
              onChange={(e) => setPaymentLcId(e.target.value)} 
              style={{ width: '100%', padding: 12, marginBottom: 10, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} 
            />
            
            <button 
              onClick={checkPaymentLC} 
              disabled={loading || !paymentLcId} 
              style={{ padding: 10, marginBottom: 20, marginRight: 10, backgroundColor: loading ? '#444' : '#666', color: '#fff', border: 'none', borderRadius: 4, cursor: (loading || !paymentLcId) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Checking...' : '🔍 Check LC'}
            </button>

            {paymentLcInfo && (
              <div style={{ padding: 15, backgroundColor: (paymentLcInfo.hasEnoughBalance && paymentLcInfo.hasEnoughAllowance) ? '#111' : '#fee', borderRadius: 4, marginBottom: 15 }}>
                <p><strong>Product ID:</strong> {paymentLcInfo.productId}</p>
                <p><strong>Buyer:</strong> <code style={{ fontSize: 12 }}>{paymentLcInfo.buyer}</code></p>
                <p><strong>Seller:</strong> <code style={{ fontSize: 12 }}>{paymentLcInfo.seller}</code></p>
                <p><strong>Amount:</strong> {paymentLcInfo.amount} mUSD</p>
                <p style={{ color: paymentLcInfo.canPay ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                  <strong>Status:</strong> {paymentLcInfo.statusName}
                </p>
                
                <div style={{ marginTop: 15, padding: 10, backgroundColor: '#000', borderRadius: 4 }}>
                  <h4 style={{ marginTop: 0 }}>💳 Payment Checks:</h4>
                  <p style={{ color: paymentLcInfo.hasEnoughBalance ? '#10b981' : '#ef4444' }}>
                    {paymentLcInfo.hasEnoughBalance ? '✅' : '❌'} Buyer Balance: {paymentLcInfo.buyerBalance} mUSD
                  </p>
                  <p style={{ color: paymentLcInfo.hasEnoughAllowance ? '#10b981' : '#ef4444' }}>
                    {paymentLcInfo.hasEnoughAllowance ? '✅' : '❌'} Allowance: {paymentLcInfo.allowance} mUSD
                  </p>
                </div>
              </div>
            )}

            <button 
              onClick={releasePayment} 
              disabled={loading || !paymentLcId || !paymentLcInfo?.canPay} 
              style={{ width: '100%', padding: 15, fontSize: 18, fontWeight: 'bold', backgroundColor: (loading || !paymentLcId || !paymentLcInfo?.canPay) ? '#444' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: (loading || !paymentLcId || !paymentLcInfo?.canPay) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Processing...' : '💰 Release Payment'}
            </button>
            <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>LC must be DELIVERED_CONFIRMED. This is the final step!</p>
          </>
        )}

        {/* RESOLVE DISPUTE */}
        {activeTab === "resolve-dispute" && (
          <>
            <h2 style={{ marginTop: 0 }}>⚖️ Resolve Dispute</h2>
            
            <input 
              placeholder="LC ID" 
              type="number" 
              value={disputeLcId} 
              onChange={(e) => setDisputeLcId(e.target.value)} 
              style={{ width: '100%', padding: 12, marginBottom: 10, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: 4 }} 
            />
            
            <button 
              onClick={checkDisputeLC} 
              disabled={loading || !disputeLcId} 
              style={{ padding: 10, marginBottom: 20, marginRight: 10, backgroundColor: loading ? '#444' : '#666', color: '#fff', border: 'none', borderRadius: 4, cursor: (loading || !disputeLcId) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Checking...' : '🔍 Check LC'}
            </button>

            {disputeLcInfo && (
              <div style={{ padding: 15, backgroundColor: '#111', borderRadius: 4, marginBottom: 15 }}>
                <p><strong>Product ID:</strong> {disputeLcInfo.productId}</p>
                <p><strong>Buyer:</strong> <code style={{ fontSize: 12 }}>{disputeLcInfo.buyer}</code></p>
                <p><strong>Seller:</strong> <code style={{ fontSize: 12 }}>{disputeLcInfo.seller}</code></p>
                <p><strong>Amount:</strong> {disputeLcInfo.amount} mUSD</p>
                <p style={{ color: disputeLcInfo.canResolve ? '#f59e0b' : '#6b7280', fontWeight: 'bold' }}>
                  <strong>Status:</strong> {disputeLcInfo.statusName}
                </p>
                <p style={{ color: disputeLcInfo.disputeRaised ? '#ef4444' : '#6b7280' }}>
                  <strong>Dispute:</strong> {disputeLcInfo.disputeRaised ? '⚠️ Active' : 'None'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => resolveDispute(true)} 
                disabled={loading || !disputeLcId || !disputeLcInfo?.canResolve} 
                style={{ flex: 1, padding: 15, fontSize: 16, fontWeight: 'bold', backgroundColor: (loading || !disputeLcId || !disputeLcInfo?.canResolve) ? '#444' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: (loading || !disputeLcId || !disputeLcInfo?.canResolve) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? '...' : '✅ Approve'}
              </button>
              <button 
                onClick={() => resolveDispute(false)} 
                disabled={loading || !disputeLcId || !disputeLcInfo?.canResolve} 
                style={{ flex: 1, padding: 15, fontSize: 16, fontWeight: 'bold', backgroundColor: (loading || !disputeLcId || !disputeLcInfo?.canResolve) ? '#444' : '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: (loading || !disputeLcId || !disputeLcInfo?.canResolve) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? '...' : '❌ Reject'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>
              Approve: Continue payment process<br/>
              Reject: Cancel LC
            </p>
          </>
        )}
      </div>
    </div>
  );
}
