import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './ShareableResourceCard.css';

const ShareableResourceCard = ({ resource, onSave, onRemove, isSaved = false }) => {
  const { user } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!user) {
      alert('Please log in to save resources');
      return;
    }


  };

  const generateShareLink = async () => {
    setIsSharing(true);
    try {
      const response = await axios.post('/api/resources/share', {
        resourceId: resource._id
      });
      const link = `${window.location.origin}/resource/${response.data.shareId}`;
      setShareLink(link);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error generating share link:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const shareOnSocialMedia = (platform) => {
    const text = `Check out this resource: ${resource.title}`;
    const url = shareLink;

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <>
      <div className="shareable-resource-card">
        <div className="card-header">
          <div className="resource-type-badge">
            {resource.type}
          </div>
          <div className="card-actions">
            {user && (
              <button
                className={`save-btn ${isSaved ? 'saved' : ''}`}
                onClick={handleSave}
                title={isSaved ? 'Remove from saved' : 'Save resource'}
              >
                {isSaved ? '❤️' : '🤍'}
              </button>
            )}
            <button
              className="share-btn"
              onClick={generateShareLink}
              disabled={isSharing}
              title="Share resource"
            >
              {isSharing ? '⏳' : '📤'}
            </button>
          </div>
        </div>

        <div className="card-content">
          <h3 className="resource-title">{resource.title}</h3>
          <p className="resource-description">{resource.description}</p>

          <div className="resource-meta">
            {resource.university && (
              <span className="meta-item">
                🏫 {resource.university.name}
              </span>
            )}
            {resource.domain && (
              <span className="meta-item">
                📚 {resource.domain.name}
              </span>
            )}
            {resource.subject && (
              <span className="meta-item">
                📖 {resource.subject.name}
              </span>
            )}
            {resource.skill && (
              <span className="meta-item">
                💻 {resource.skill}
              </span>
            )}
            {resource.exam && (
              <span className="meta-item">
                📝 {resource.exam}
              </span>
            )}
          </div>

          <div className="resource-footer">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-btn"
            >
              Visit Resource →
            </a>
            <span className="submitted-by">
              by {resource.submittedBy?.name || 'Anonymous'}
            </span>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Resource</h3>
              <button
                className="close-btn"
                onClick={() => setShowShareModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="share-link-section">
                <label>Share Link:</label>
                <div className="link-input-group">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="share-link-input"
                  />
                  <button
                    className={`copy-btn ${copied ? 'copied' : ''}`}
                    onClick={copyToClipboard}
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="social-share-section">
                <label>Share on:</label>
                <div className="social-buttons">
                  <button
                    className="social-btn twitter"
                    onClick={() => shareOnSocialMedia('twitter')}
                  >
                    Twitter
                  </button>
                  <button
                    className="social-btn facebook"
                    onClick={() => shareOnSocialMedia('facebook')}
                  >
                    Facebook
                  </button>
                  <button
                    className="social-btn linkedin"
                    onClick={() => shareOnSocialMedia('linkedin')}
                  >
                    LinkedIn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareableResourceCard; 