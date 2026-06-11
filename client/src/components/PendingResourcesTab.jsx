import React, { useState } from 'react';
import {
    Search,
    Filter,
    Check,
    X,
    Eye,
    Clock
} from 'lucide-react';

const PendingResourcesTab = ({
    pendingResources,
    handleApprovalStatusChange,
    loading
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredResources = pendingResources.filter(resource =>
        !searchTerm ||
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading pending resources...</span>
            </div>
        );
    }

    return (
        <div className="pending-resources">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <div className="page-header-text">
                        <h2>Pending Resources</h2>
                        <p>{pendingResources.length} resources waiting for approval</p>
                    </div>
                    <div className="page-header-actions">
                        <div className="search-container">
                            <Search size={20} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        {/* <button className="btn btn-secondary">
                            <Filter size={16} />
                            Filter
                        </button> */}
                    </div>
                </div>
            </div>

            {/* Resources List */}
            <div className="resource-list">
                {filteredResources.map((resource) => (
                    <div key={resource.id} className="resource-card">
                        <div className="resource-content">
                            <div className="resource-info">
                                <div className="resource-header">
                                    <h3 className="resource-title">{resource.title}</h3>
                                    <span className="status-badge">
                                        Pending Review
                                    </span>
                                </div>
                                <p className="resource-description">
                                    {resource.description || 'No description provided'}
                                </p>

                                {resource.url && (
                                    <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="resource-link"
                                    >
                                        <Eye size={16} />
                                        View Resource
                                    </a>
                                )}

                                <div className="resource-tags">
                                    {resource.subjects && (
                                        <>
                                            <span className="resource-tag subject">
                                                📚 {resource.subjects.name}
                                            </span>
                                            {resource.subjects.domains && (
                                                <span className="resource-tag domain">
                                                    🎯 {resource.subjects.domains.name}
                                                </span>
                                            )}
                                            {resource.subjects.domains?.universities && (
                                                <span className="resource-tag university">
                                                    🏫 {resource.subjects.domains.universities.name}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="resource-meta">
                                    <span>Submitted by {resource.user_profiles?.full_name || 'Anonymous'}</span>
                                    <span>•</span>
                                    <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="resource-actions">
                                <button
                                    onClick={() => handleApprovalStatusChange(resource.id, 'approved')}
                                    className="btn-approve"
                                >
                                    <Check size={16} />
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleApprovalStatusChange(resource.id, 'denied')}
                                    className="btn-deny"
                                >
                                    <X size={16} />
                                    Deny
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredResources.length === 0 && (
                    <div className="empty-resource-state">
                        <div className="empty-resource-icon">
                            <Clock size={64} />
                        </div>
                        <h3 className="empty-resource-title">No pending resources</h3>
                        <p className="empty-resource-subtitle">
                            {searchTerm ? 'Try adjusting your search terms' : 'All submissions have been reviewed!'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingResourcesTab;