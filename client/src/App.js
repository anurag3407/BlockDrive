
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Upload from "./artifacts/contracts/Upload.sol/Upload.json";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import Modal from "./components/Modal";
import "./App.css";

// Contract configuration
const HARDHAT_CHAIN_ID = "0x539"; // 1337 in hex
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const HARDHAT_NETWORK_CONFIG = {
  chainId: HARDHAT_CHAIN_ID,
  chainName: "Hardhat Local",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: null
};

function App() {
  // State management
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Auto-dismiss error messages
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => {
        setConnectionError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [connectionError]);

  // Check MetaMask connection on load
  useEffect(() => {
    checkMetaMaskConnection();
  }, []);

  const checkMetaMaskConnection = async () => {
    try {
      if (!window.ethereum) {
        setIsLoading(false);
        return;
      }

      // Check if already connected
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts.length > 0) {
        await initializeProvider(accounts[0]);
      }

      // Setup event listeners
      window.ethereum.on("chainChanged", handleChainChanged);
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      
    } catch (error) {
      console.error("Error checking MetaMask connection:", error);
      setConnectionError("Failed to initialize MetaMask connection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChainChanged = useCallback(() => {
    window.location.reload();
  }, []);

  const handleAccountsChanged = useCallback(async (accounts) => {
    if (accounts.length > 0) {
      await initializeProvider(accounts[0]);
    } else {
      // User disconnected
      setAccount("");
      setContract(null);
      setProvider(null);
      setWrongNetwork(false);
    }
  }, []);

  const initializeProvider = async (userAccount) => {
    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const network = await web3Provider.getNetwork();
      
      // Check if on correct network
      if (network.chainId !== 1337n) {
        setWrongNetwork(true);
        setAccount(userAccount);
        return;
      }

      setWrongNetwork(false);
      setAccount(userAccount);
      setProvider(web3Provider);

      // Initialize contract
      const signer = await web3Provider.getSigner();
      const uploadContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        Upload.abi,
        signer
      );
      setContract(uploadContract);
      
    } catch (error) {
      console.error("Error initializing provider:", error);
      setConnectionError("Failed to initialize blockchain connection");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setConnectionError("MetaMask is not installed. Please install MetaMask extension.");
      return;
    }

    if (isConnecting) return;

    try {
      setIsConnecting(true);
      setConnectionError("");

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask");
      }

      // Check and switch network if needed
      await ensureCorrectNetwork();
      
      // Initialize provider with first account
      await initializeProvider(accounts[0]);

    } catch (error) {
      console.error("Error connecting wallet:", error);
      
      if (error.code === 4001) {
        setConnectionError("Connection rejected by user");
      } else if (error.code === -32002) {
        setConnectionError("MetaMask is busy. Please check MetaMask and try again.");
      } else {
        setConnectionError(error.message || "Failed to connect wallet");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const ensureCorrectNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== HARDHAT_CHAIN_ID) {
        try {
          // Try to switch to Hardhat network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HARDHAT_CHAIN_ID }],
          });
        } catch (switchError) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [HARDHAT_NETWORK_CONFIG]
            });
          } else {
            throw switchError;
          }
        }
      }
    } catch (error) {
      console.error("Error switching network:", error);
      throw new Error("Failed to switch to Hardhat network");
    }
  };

  const switchNetwork = async () => {
    try {
      await ensureCorrectNetwork();
      if (account) {
        await initializeProvider(account);
      }
    } catch (error) {
      setConnectionError("Failed to switch network. Please switch manually in MetaMask.");
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setContract(null);
    setProvider(null);
    setWrongNetwork(false);
    setConnectionError("");
  };

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, [handleChainChanged, handleAccountsChanged]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>Initializing BlockDrive...</h2>
        <p>Checking MetaMask connection</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Background Elements */}
      <div className="bg-animation">
        <div className="bg bg1"></div>
        <div className="bg bg2"></div>
        <div className="bg bg3"></div>
      </div>

      {/* Top Title */}
      <div className="app-title-header">
        <h1 className="main-title">Block Drive</h1>
      </div>

      {/* Account Address Bar */}
      {account && (
        <div className="account-bar">
          <div className="account-info">
            <span className="account-label">Connected Account:</span>
            <div className="account-address-display">
              <span className="account-address-full" title={account}>
                {account}
              </span>
              <button 
                className="copy-account-btn"
                onClick={() => navigator.clipboard.writeText(account)}
                title="Copy account address"
              >
                📋
              </button>
            </div>
          </div>
          <div className="account-actions">
            <button 
              className="disconnect-btn-new" 
              onClick={disconnectWallet}
              title="Disconnect Wallet"
            >
              <span className="btn-icon">🚫</span>
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Error Messages */}
        {connectionError && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span className="alert-message">{connectionError}</span>
            <button 
              className="alert-close" 
              onClick={() => setConnectionError("")}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Wrong Network Warning */}
        {wrongNetwork && account && (
          <div className="alert alert-warning">
            <span className="alert-icon">🔗</span>
            <div className="alert-content">
              <span className="alert-message">
                Please switch to Hardhat Local network (Chain ID: 1337)
              </span>
              <button className="switch-network-btn" onClick={switchNetwork}>
                Switch Network
              </button>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        {!account && (
          <section className="welcome-section">
            <div className="welcome-content">
              <div className="app-branding">
                <h1 className="app-title-main">
                  <span className="title-icon">🚀</span>
                  BlockDrive 3.0
                </h1>
                <p className="app-subtitle-main">Decentralized File Storage</p>
              </div>

              <div className="connect-section">
                <h2>Connect Your Wallet to Get Started</h2>
                <p>Your decentralized file storage solution on the blockchain</p>
                
                <button 
                  className="connect-btn-main" 
                  onClick={connectWallet} 
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <span className="loading-spinner small"></span>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🦊</span>
                      Connect MetaMask Wallet
                    </>
                  )}
                </button>
              </div>
              
              <div className="features-grid">
                <div className="feature-card">
                  <span className="feature-icon">🔒</span>
                  <h3>Secure Storage</h3>
                  <p>Files stored on IPFS with blockchain security</p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">🌐</span>
                  <h3>Decentralized</h3>
                  <p>No single point of failure or control</p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">🤝</span>
                  <h3>Easy Sharing</h3>
                  <p>Share files with specific addresses</p>
                </div>
              </div>

              <div className="getting-started">
                <h3>🚀 Getting Started</h3>
                <ol className="steps-list">
                  <li>Install MetaMask browser extension</li>
                  <li>Connect your wallet using the button above</li>
                  <li>Switch to Hardhat Local network when prompted</li>
                  <li>Start uploading and sharing your files!</li>
                </ol>
              </div>
            </div>
          </section>
        )}

        {/* App Features */}
        {account && !wrongNetwork && (
          <div className="app-features">
            <FileUpload
              account={account}
              provider={provider}
              contract={contract}
            />
            <Display 
              contract={contract} 
              account={account} 
            />
          </div>
        )}
      </main>

      {/* Share Modal */}
      {modalOpen && (
        <Modal 
          setModalOpen={setModalOpen} 
          contract={contract} 
        />
      )}
    </div>
  );
}

export default App;
