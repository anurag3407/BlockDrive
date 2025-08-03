
import { useState, useEffect } from "react";
import "./Display.css";

const Display = ({ contract, account }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewAddress, setViewAddress] = useState("");
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentViewingAddress, setCurrentViewingAddress] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareAddress, setShareAddress] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [sharedAccess, setSharedAccess] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  // Auto-load user's files when component mounts
  useEffect(() => {
    if (account && contract) {
      loadUserFiles();
      loadSharedAccess();
    }
  }, [account, contract]);

  const loadUserFiles = async () => {
    if (!account) return;
    setViewAddress(account);
    await getdata(account);
  };

  const loadSharedAccess = async () => {
    if (!contract || !account) return;
    
    try {
      const accessList = await contract.shareAccess();
      setSharedAccess(accessList);
    } catch (error) {
      console.error("Error loading shared access:", error);
    }
  };

  const shareAccess = async (targetAddress) => {
    if (!contract || !account) {
      setError("Contract not available");
      return;
    }

    if (!targetAddress.trim()) {
      setError("Please enter a valid address");
      return;
    }

    setShareLoading(true);
    setError("");
    
    try {
      const transaction = await contract.allow(targetAddress);
      await transaction.wait();
      
      setSuccessMessage(`Successfully shared access with ${targetAddress}`);
      setShareAddress("");
      setShowShareModal(false);
      
      // Reload shared access list
      await loadSharedAccess();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
      
    } catch (error) {
      console.error("Error sharing access:", error);
      setError("Failed to share access. Please try again.");
    } finally {
      setShareLoading(false);
    }
  };

  const revokeAccess = async (targetAddress) => {
    if (!contract || !account) {
      setError("Contract not available");
      return;
    }

    try {
      const transaction = await contract.disallow(targetAddress);
      await transaction.wait();
      
      setSuccessMessage(`Successfully revoked access for ${targetAddress}`);
      
      // Reload shared access list
      await loadSharedAccess();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
      
    } catch (error) {
      console.error("Error revoking access:", error);
      setError("Failed to revoke access. Please try again.");
    }
  };

  const getdata = async (address = null) => {
    if (!contract) {
      setError("Contract not available");
      return;
    }

    const targetAddress = address || viewAddress || account;
    if (!targetAddress) {
      setError("Please enter an address");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const dataArray = await contract.display(targetAddress);
      console.log("Raw data from contract:", dataArray);
      
      if (!dataArray || dataArray.length === 0) {
        setData([]);
        setError("No files found for this address");
        setCurrentViewingAddress(targetAddress);
        return;
      }

      // Process the data - dataArray should be an array of IPFS URLs
      const processedImages = dataArray.map((item, i) => {
        // Handle different URL formats
        let imageUrl = item;
        
        // If it's already a full URL, use it directly
        if (item.startsWith('https://gateway.pinata.cloud/ipfs/')) {
          imageUrl = item;
        } 
        // If it starts with ipfs://, convert it
        else if (item.startsWith('ipfs://')) {
          imageUrl = `https://gateway.pinata.cloud/ipfs/${item.substring(7)}`;
        }
        // If it's just a hash, add the gateway
        else {
          imageUrl = `https://gateway.pinata.cloud/ipfs/${item}`;
        }

        return {
          id: i,
          url: imageUrl,
          hash: item,
          name: `File ${i + 1}`
        };
      });

      setData(processedImages);
      setCurrentViewingAddress(targetAddress);
      console.log("Processed images:", processedImages);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("You don't have access to view files from this address");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!viewAddress.trim()) {
      setError("Please enter a valid address");
      return;
    }
    getdata(viewAddress);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show temporary success feedback
      const originalText = text;
      setViewAddress("Copied!");
      setTimeout(() => {
        setViewAddress(originalText === currentViewingAddress ? currentViewingAddress : "");
      }, 1000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return address;
  };

  const openShareModal = () => {
    setShowShareModal(true);
    setShareAddress("");
    setError("");
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareAddress("");
    setShareLoading(false);
  };

  const openImageModal = (image) => {
    setSelectedImage(image);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="display-container">
      <div className="display-header">
        <h2>🖼️ File Gallery</h2>
        <p>View and browse files stored on the blockchain</p>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <div className="address-input-wrapper">
            <input
              type="text"
              placeholder="Enter wallet address to view files..."
              className="address-input"
              value={viewAddress}
              onChange={(e) => setViewAddress(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            {viewAddress && (
              <button 
                className="copy-btn"
                onClick={() => copyToClipboard(viewAddress)}
                title="Copy address"
              >
                📋
              </button>
            )}
          </div>
          <button 
            className="search-btn" 
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Loading...
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                Search Files
              </>
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button 
            className="quick-btn my-files"
            onClick={loadUserFiles}
            disabled={!account}
          >
            <span className="btn-icon">👤</span>
            My Files
          </button>
          <button 
            className="quick-btn share-btn"
            onClick={openShareModal}
            disabled={!account}
          >
            <span className="btn-icon">🔗</span>
            Share Access
          </button>
        </div>
      </div>

      {/* Current Viewing Address */}
      {currentViewingAddress && (
        <div className="viewing-info">
          <div className="viewing-address">
            <span className="label">Viewing files from:</span>
            <div className="address-display">
              <span className="address-text" title={currentViewingAddress}>
                {formatAddress(currentViewingAddress)}
              </span>
              <button 
                className="copy-address-btn"
                onClick={() => copyToClipboard(currentViewingAddress)}
                title="Copy full address"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          <span>{successMessage}</span>
          <button 
            className="alert-close" 
            onClick={() => setSuccessMessage("")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
          <button 
            className="alert-close" 
            onClick={() => setError("")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Gallery */}
      <div className="gallery-container">
        {loading ? (
          <div className="loading-gallery">
            <div className="loading-spinner"></div>
            <p>Loading files...</p>
          </div>
        ) : data.length > 0 ? (
          <>
            <div className="gallery-header">
              <h3>📁 Files ({data.length})</h3>
            </div>
            <div className="image-gallery">
              {data.map((image) => (
                <div key={image.id} className="image-card">
                  <div className="image-wrapper" onClick={() => openImageModal(image)}>
                    <img
                      src={image.url}
                      alt={image.name}
                      className="gallery-image"
                      onError={(e) => {
                        console.error("Failed to load image:", image.url);
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Ctext x='100' y='100' font-family='Arial' font-size='14' fill='%23999' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="image-overlay">
                      <span className="view-icon">👁️</span>
                      <span className="view-text">View</span>
                    </div>
                  </div>
                  <div className="image-info">
                    <div className="image-name">{image.name}</div>
                    <div className="image-actions">
                      <a 
                        href={image.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="action-btn"
                        title="Open in new tab"
                      >
                        🔗
                      </a>
                      <button 
                        className="action-btn"
                        onClick={() => copyToClipboard(image.url)}
                        title="Copy image URL"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : currentViewingAddress && !loading ? (
          <div className="empty-gallery">
            <div className="empty-icon">📂</div>
            <h3>No Files Found</h3>
            <p>This address doesn't have any files stored or you don't have permission to view them.</p>
          </div>
        ) : null}
      </div>

      {/* Share Access Modal */}
      {showShareModal && (
        <div className="share-modal" onClick={closeShareModal}>
          <div className="modal-content share-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="share-header">
              <h3>🔗 Share File Access</h3>
              <button className="modal-close" onClick={closeShareModal}>✕</button>
            </div>
            
            <div className="share-body">
              <div className="share-section">
                <h4>Grant Access to New Address</h4>
                <div className="share-input-group">
                  <input
                    type="text"
                    placeholder="Enter wallet address (0x...)"
                    value={shareAddress}
                    onChange={(e) => setShareAddress(e.target.value)}
                    className="share-input"
                  />
                  <button 
                    className="share-grant-btn"
                    onClick={() => shareAccess(shareAddress)}
                    disabled={shareLoading || !shareAddress.trim()}
                  >
                    {shareLoading ? (
                      <>
                        <span className="btn-spinner"></span>
                        Granting...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">✅</span>
                        Grant Access
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="share-section">
                <h4>Current Shared Access ({sharedAccess.length})</h4>
                <div className="access-list">
                  {sharedAccess.length > 0 ? (
                    sharedAccess.map((access, index) => (
                      <div key={index} className={`access-item ${access.access ? 'active' : 'revoked'}`}>
                        <div className="access-info">
                          <span className="access-address">{access.user}</span>
                          <span className={`access-status ${access.access ? 'granted' : 'revoked'}`}>
                            {access.access ? '✅ Active' : '❌ Revoked'}
                          </span>
                        </div>
                        <div className="access-actions">
                          <button 
                            className="copy-access-btn"
                            onClick={() => copyToClipboard(access.user)}
                            title="Copy address"
                          >
                            📋
                          </button>
                          {access.access && (
                            <button 
                              className="revoke-btn"
                              onClick={() => revokeAccess(access.user)}
                              title="Revoke access"
                            >
                              �
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-access">
                      <p>No shared access granted yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-simple" onClick={closeImageModal}>✕</button>
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name}
              className="modal-image-simple"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default Display;
