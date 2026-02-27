"use client";
import { useEffect, useState } from "react";
import {
  LetterOfCreditABI,
  SupplyChainABI,
  USDTokenABI,
  RoleRegistryABI,
  CONTRACTS,
  ACCOUNTS,
} from "@/contracts";
import { getSigner } from "@/lib/ethers";
import { getLCContract, getSupplyChainContract } from "@/lib/contracts";

export default function TestABI() {
  const [results, setResults] = useState<any>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testABIs();
  }, []);

  async function testABIs() {
    const testResults: any = {
      timestamp: new Date().toISOString(),
    };

    try {
      console.log("🔍 Testing ABIs...");

      // Test 1: Check if ABIs exist
      testResults.lcAbiExists = !!LetterOfCreditABI;
      testResults.scAbiExists = !!SupplyChainABI;
      testResults.usdAbiExists = !!USDTokenABI;
      testResults.rrAbiExists = !!RoleRegistryABI;

      console.log("✅ ABI Files:", {
        LetterOfCredit: testResults.lcAbiExists,
        SupplyChain: testResults.scAbiExists,
        USDToken: testResults.usdAbiExists,
        RoleRegistry: testResults.rrAbiExists,
      });

      // Test 2: Check ABI structure
      if (LetterOfCreditABI?.abi) {
        const lcFunctions = LetterOfCreditABI.abi
          .filter((x: any) => x.type === "function")
          .map((x: any) => x.name);
        
        testResults.lcFunctions = lcFunctions;
        console.log("📋 LC Functions:", lcFunctions);

        // Check for required functions
        const requiredFunctions = ["openLC", "approveLC", "markDeliveredPending", "confirmDelivered", "lcs"];
        const missingFunctions = requiredFunctions.filter(fn => !lcFunctions.includes(fn));
        
        testResults.lcRequiredFunctionsOk = missingFunctions.length === 0;
        testResults.lcMissingFunctions = missingFunctions;

        if (missingFunctions.length > 0) {
          console.warn("⚠️ Missing LC functions:", missingFunctions);
        } else {
          console.log("✅ All required LC functions present");
        }
      } else {
        testResults.lcAbiInvalid = "No abi property found";
        console.error("❌ LC ABI has no 'abi' property");
      }

      if (SupplyChainABI?.abi) {
        const scFunctions = SupplyChainABI.abi
          .filter((x: any) => x.type === "function")
          .map((x: any) => x.name);
        
        testResults.scFunctions = scFunctions;
        console.log("📋 SC Functions:", scFunctions);

        const requiredFunctions = ["createProduct", "markDelivered", "confirmReceived", "products"];
        const missingFunctions = requiredFunctions.filter(fn => !scFunctions.includes(fn));
        
        testResults.scRequiredFunctionsOk = missingFunctions.length === 0;
        testResults.scMissingFunctions = missingFunctions;

        if (missingFunctions.length > 0) {
          console.warn("⚠️ Missing SC functions:", missingFunctions);
        } else {
          console.log("✅ All required SC functions present");
        }
      }

      // Test 3: Check contract addresses
      testResults.contracts = CONTRACTS;
      console.log("📍 Contract Addresses:", CONTRACTS);

      // Test 4: Check accounts
      testResults.accounts = ACCOUNTS;
      console.log("👥 Accounts:", ACCOUNTS);

      // Test 5: Try to create contract instances
      try {
        const signer = await getSigner();
        testResults.signerConnected = true;
        
        const lcContract = getLCContract(signer);
        const scContract = getSupplyChainContract(signer);

        testResults.lcContractCreated = !!lcContract;
        testResults.scContractCreated = !!scContract;

        console.log("✅ Contract instances created:", {
          LC: testResults.lcContractCreated,
          SC: testResults.scContractCreated,
        });

        // Test 6: Check if contracts exist on chain
        const lcCode = await signer.provider.getCode(CONTRACTS.LetterOfCredit);
        const scCode = await signer.provider.getCode(CONTRACTS.SupplyChain);

        testResults.lcDeployed = lcCode !== "0x";
        testResults.scDeployed = scCode !== "0x";

        console.log("🔗 Contracts on chain:", {
          LC: testResults.lcDeployed ? "✅ Deployed" : "❌ Not found",
          SC: testResults.scDeployed ? "✅ Deployed" : "❌ Not found",
        });

        // Test 7: Try a simple view call
        try {
          const lcCounter = await lcContract.lcCounter();
          testResults.lcCounterValue = lcCounter.toString();
          testResults.lcViewCallSuccess = true;
          console.log("✅ LC view call successful. lcCounter:", lcCounter.toString());
        } catch (err: any) {
          testResults.lcViewCallSuccess = false;
          testResults.lcViewCallError = err.message;
          console.error("❌ LC view call failed:", err.message);
        }

        try {
          const productCount = await scContract.productCount();
          testResults.productCountValue = productCount.toString();
          testResults.scViewCallSuccess = true;
          console.log("✅ SC view call successful. productCount:", productCount.toString());
        } catch (err: any) {
          testResults.scViewCallSuccess = false;
          testResults.scViewCallError = err.message;
          console.error("❌ SC view call failed:", err.message);
        }

      } catch (err: any) {
        testResults.signerError = err.message;
        console.error("❌ Signer error:", err.message);
      }

      setResults(testResults);
      console.log("\n📊 Full Test Results:", testResults);

    } catch (err: any) {
      console.error("❌ Test failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      padding: 40,
      maxWidth: 1200,
      margin: '0 auto',
      backgroundColor: '#000',
      color: '#fff',
      minHeight: '100vh',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ marginBottom: 30 }}>🧪 ABI Test Page</h1>

      {loading && (
        <div style={{ padding: 20, backgroundColor: '#1a1a1a', borderRadius: 8 }}>
          Testing ABIs... Check browser console for details.
        </div>
      )}

      {error && (
        <div style={{
          padding: 20,
          backgroundColor: '#7f1d1d',
          borderRadius: 8,
          marginBottom: 20,
          border: '2px solid #ef4444'
        }}>
          <h3 style={{ margin: 0, color: '#f87171' }}>❌ Error</h3>
          <pre style={{ marginTop: 10, fontSize: 12 }}>{error}</pre>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ABI Status */}
          <div style={{
            padding: 20,
            backgroundColor: '#1a1a1a',
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #333'
          }}>
            <h3 style={{ marginTop: 0 }}>📋 ABI Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div style={{
                padding: 10,
                backgroundColor: results.lcAbiExists ? '#064e3b' : '#7f1d1d',
                borderRadius: 4
              }}>
                {results.lcAbiExists ? '✅' : '❌'} LetterOfCredit ABI
              </div>
              <div style={{
                padding: 10,
                backgroundColor: results.scAbiExists ? '#064e3b' : '#7f1d1d',
                borderRadius: 4
              }}>
                {results.scAbiExists ? '✅' : '❌'} SupplyChain ABI
              </div>
              <div style={{
                padding: 10,
                backgroundColor: results.usdAbiExists ? '#064e3b' : '#7f1d1d',
                borderRadius: 4
              }}>
                {results.usdAbiExists ? '✅' : '❌'} USDToken ABI
              </div>
              <div style={{
                padding: 10,
                backgroundColor: results.rrAbiExists ? '#064e3b' : '#7f1d1d',
                borderRadius: 4
              }}>
                {results.rrAbiExists ? '✅' : '❌'} RoleRegistry ABI
              </div>
            </div>
          </div>

          {/* Functions */}
          {results.lcFunctions && (
            <div style={{
              padding: 20,
              backgroundColor: '#1a1a1a',
              borderRadius: 8,
              marginBottom: 20,
              border: '1px solid #333'
            }}>
              <h3 style={{ marginTop: 0 }}>📝 LetterOfCredit Functions</h3>
              <div style={{
                backgroundColor: results.lcRequiredFunctionsOk ? '#064e3b' : '#7f1d1d',
                padding: 10,
                borderRadius: 4,
                marginBottom: 10
              }}>
                {results.lcRequiredFunctionsOk ? '✅ All required functions present' : '⚠️ Missing functions'}
              </div>
              <div style={{ fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {results.lcFunctions.map((fn: string) => (
                  <code key={fn} style={{
                    padding: '5px 10px',
                    backgroundColor: '#111',
                    borderRadius: 4
                  }}>
                    {fn}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Contract Deployment Status */}
          <div style={{
            padding: 20,
            backgroundColor: '#1a1a1a',
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #333'
          }}>
            <h3 style={{ marginTop: 0 }}>🔗 Contract Deployment</h3>
            <div style={{ fontSize: 13 }}>
              <div style={{
                padding: 10,
                backgroundColor: results.lcDeployed ? '#064e3b' : '#7f1d1d',
                borderRadius: 4,
                marginBottom: 5
              }}>
                {results.lcDeployed ? '✅' : '❌'} LetterOfCredit: <code style={{ fontSize: 11 }}>{CONTRACTS.LetterOfCredit}</code>
              </div>
              <div style={{
                padding: 10,
                backgroundColor: results.scDeployed ? '#064e3b' : '#7f1d1d',
                borderRadius: 4
              }}>
                {results.scDeployed ? '✅' : '❌'} SupplyChain: <code style={{ fontSize: 11 }}>{CONTRACTS.SupplyChain}</code>
              </div>
            </div>
          </div>

          {/* View Call Tests */}
          <div style={{
            padding: 20,
            backgroundColor: '#1a1a1a',
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #333'
          }}>
            <h3 style={{ marginTop: 0 }}>🔍 View Call Tests</h3>
            <div style={{ fontSize: 13 }}>
              <div style={{
                padding: 10,
                backgroundColor: results.lcViewCallSuccess ? '#064e3b' : '#7f1d1d',
                borderRadius: 4,
                marginBottom: 5
              }}>
                {results.lcViewCallSuccess ? '✅' : '❌'} LC.lcCounter(): {results.lcCounterValue || results.lcViewCallError}
              </div>
              <div style={{
                padding: 10,
                backgroundColor: results.scViewCallSuccess ? '#064e3b' : '#7f1d1d',
                borderRadius: 4
              }}>
                {results.scViewCallSuccess ? '✅' : '❌'} SC.productCount(): {results.productCountValue || results.scViewCallError}
              </div>
            </div>
          </div>

          {/* Full Results */}
          <div style={{
            padding: 20,
            backgroundColor: '#1a1a1a',
            borderRadius: 8,
            border: '1px solid #333'
          }}>
            <h3 style={{ marginTop: 0 }}>📊 Full Test Results</h3>
            <pre style={{
              fontSize: 11,
              overflow: 'auto',
              backgroundColor: '#111',
              padding: 15,
              borderRadius: 4,
              maxHeight: 400
            }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </>
      )}

      <div style={{
        marginTop: 30,
        padding: 15,
        backgroundColor: '#1a1a2e',
        borderRadius: 8,
        border: '1px solid #6366f1'
      }}>
        <h4 style={{ marginTop: 0, color: '#818cf8' }}>💡 Instructions</h4>
        <ol style={{ fontSize: 13, paddingLeft: 20 }}>
          <li>This page tests all ABIs and contract connections</li>
          <li>Check browser console (F12) for detailed logs</li>
          <li>All checks should show ✅ green if everything is working</li>
          <li>If any checks fail, review the error messages above</li>
        </ol>
      </div>
    </div>
  );
}
