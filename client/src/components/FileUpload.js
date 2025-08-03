
import { useState, useRef } from "react";
import axios from "axios";
import "./FileUpload.css";

const FileUpload = ({ contract, account, provider }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const resFile = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data: formData,
        headers: {
          pinata_api_key: "8819404ba34769d736a5",
          pinata_secret_api_key: "433122da3fbbf685531b6524a812af033265f066ce006e00f524c3cee8ff4155",
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(95);

      const ImgHash = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;
      
      if (contract && account) {
        await contract.add(account, ImgHash);
        setUploadProgress(100);
        setSuccess("File uploaded successfully to blockchain!");
      } else {
        throw new Error("Contract or account not available");
      }

      // Reset form
      setTimeout(() => {
        setFileName("");
        setFile(null);
        setUploadProgress(0);
        setSuccess("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 3000);

    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload file. Please check your connection and try again.");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const retrieveFile = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  const handleFileSelection = (selectedFile) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please select a valid image file (JPEG, PNG, GIF, WebP)");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError("");
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileName("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      <div className="upload-header">
        <h2>📁 Upload Your Files</h2>
        <p>Securely store your files on the decentralized blockchain</p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileSelector}
        >
          <input
            ref={fileInputRef}
            disabled={!account || uploading}
            type="file"
            id="file-upload"
            name="data"
            onChange={retrieveFile}
            accept="image/*"
            style={{ display: 'none' }}
          />

          {!file ? (
            <div className="drop-zone-content">
              <div className="upload-icon">☁️</div>
              <h3>Drop your files here</h3>
              <p>or <span className="browse-text">browse files</span></p>
              <div className="supported-formats">
                <small>Supports: JPEG, PNG, GIF, WebP (max 10MB)</small>
              </div>
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-info">
                <div className="file-icon">📄</div>
                <div className="file-details">
                  <div className="file-name">{fileName}</div>
                  <div className="file-size">{formatFileSize(file.size)}</div>
                </div>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
            <button
              type="button"
              className="alert-close"
              onClick={() => setError("")}
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            <span>{success}</span>
          </div>
        )}

        {uploading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="progress-text">{uploadProgress}% uploaded</div>
          </div>
        )}

        <div className="upload-actions">
          <button
            type="submit"
            className={`upload-btn ${!file || !account || uploading ? 'disabled' : ''}`}
            disabled={!file || !account || uploading}
          >
            {uploading ? (
              <>
                <span className="btn-spinner"></span>
                Uploading...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Upload to Blockchain
              </>
            )}
          </button>

          {!account && (
            <div className="wallet-warning">
              <span className="warning-icon">⚠️</span>
              Please connect your wallet to upload files
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
export default FileUpload;
