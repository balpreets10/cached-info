import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import ShareableResourceCard from '../components/ShareableResourceCard';
import './HomePage.css';

const HomePage = () => {
    const { user } = useAuth();
    const {
        searchResources,
        getRecentResources,
        getStats,
        extractSearchableTerms
    } = useData();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [recentResources, setRecentResources] = useState([]);
    const [savedResources, setSavedResources] = useState([]);
    const [stats, setStats] = useState({
        totalResources: 0,
        totalUsers: 0,
        totalRequests: 0
    });
    const [allSearchableTerms, setAllSearchableTerms] = useState([]);

    // Modal states
    const [selectedResource, setSelectedResource] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const searchInputRef = useRef(null);
    const autocompleteRef = useRef(null);

    // Initialize data from Supabase
    useEffect(() => {
        const initializeData = async () => {
            // Load recent resources
            const recent = getRecentResources(6);
            setRecentResources(recent);

            // Load searchable terms
            const terms = extractSearchableTerms();
            setAllSearchableTerms(terms);

            // Load stats
            const statsData = await getStats();
            setStats(statsData);

            // Load saved resources from localStorage
            const saved = JSON.parse(localStorage.getItem('savedResources') || '[]');
            setSavedResources(saved);
        };

        initializeData();
    }, [getRecentResources, extractSearchableTerms, getStats]);

    // Handle autocomplete as user types
    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            const filteredTerms = allSearchableTerms.filter(term =>
                term.text.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 8);

            setAutocompleteResults(filteredTerms);
            setShowAutocomplete(true);
        } else {
            setAutocompleteResults([]);
            setShowAutocomplete(false);
        }
    }, [searchQuery, allSearchableTerms]);

    // Close autocomplete when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
                setShowAutocomplete(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSaveResource = (resource) => {
        const newSavedResources = [...savedResources, resource._id];
        setSavedResources(newSavedResources);
        localStorage.setItem('savedResources', JSON.stringify(newSavedResources));
    };

    const handleRemoveResource = (resourceId) => {
        const newSavedResources = savedResources.filter(id => id !== resourceId);
        setSavedResources(newSavedResources);
        localStorage.setItem('savedResources', JSON.stringify(newSavedResources));
    };

    // Modal functions
    const handleResourceClick = (resource) => {
        setSelectedResource(resource);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedResource(null);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setShowAutocomplete(false);

        setTimeout(() => {
            const results = searchResources(searchQuery, 5);
            setSearchResults(results);
            setIsSearching(false);
        }, 300);
    };

    const handleSearchInputChange = (e) => {
        setSearchQuery(e.target.value);
        setSearchResults([]);
    };

    const handleAutocompleteSelect = (selectedTerm) => {
        setSearchQuery(selectedTerm.text);
        setShowAutocomplete(false);
        searchInputRef.current.focus();

        setTimeout(() => {
            handleSearchWithQuery(selectedTerm.text);
        }, 100);
    };

    const handleSearchWithQuery = (query) => {
        setIsSearching(true);

        setTimeout(() => {
            const results = searchResources(query, 5);
            setSearchResults(results);
            setIsSearching(false);
        }, 300);
    };

    const handleInputFocus = () => {
        if (searchQuery.trim().length > 0) {
            setShowAutocomplete(true);
        }
    };

    return (
        <div className="homepage">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Discover Learning Resources
                        <span className="highlight"> That Matter</span>
                    </h1>
                    <p className="hero-subtitle">
                        Find the best educational resources for your academic journey.
                        From university materials to skill development, we've got you covered.
                    </p>

                    {/* Universal Search Bar with Autocomplete */}
                    <div className="search-container" ref={autocompleteRef}>
                        <form onSubmit={handleSearch} className="search-form">
                            <div className="search-input-wrapper">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search by topic, resource, subject, domain, or field..."
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    onFocus={handleInputFocus}
                                    className="search-input"
                                    autoComplete="off"
                                />
                                <button type="submit" className="search-button" disabled={isSearching}>
                                    {isSearching ? (
                                        <div className="search-spinner"></div>
                                    ) : (
                                        <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Autocomplete Suggestions */}
                        {showAutocomplete && autocompleteResults.length > 0 && (
                            <div className="autocomplete-dropdown">
                                {autocompleteResults.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleAutocompleteSelect(suggestion)}
                                        className="autocomplete-item"
                                        tabIndex={0}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                handleAutocompleteSelect(suggestion);
                                            }
                                        }}
                                    >
                                        <div className="autocomplete-text">{suggestion.text}</div>
                                        <div className="autocomplete-category">{suggestion.category}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && !showAutocomplete && (
                            <div className="search-results">
                                <div className="search-results-header">
                                    🔍 Search Results
                                </div>
                                {searchResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className="search-result-item"
                                        onClick={() => {
                                            setSearchResults([]);
                                            handleResourceClick(result);
                                        }}
                                    >
                                        <div className="result-icon">
                                            {result.type === 'university' && '🎓'}
                                            {result.type === 'skill' && '💡'}
                                            {result.type === 'competitive' && '📚'}
                                        </div>
                                        <div className="result-content">
                                            <h4>{result.title}</h4>
                                            <p>{result.description.substring(0, 80)}...</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="quick-actions">
                        <Link to="/submit" className="action-button primary">
                            <span className="action-icon">📤</span>
                            Submit a Resource
                        </Link>
                        <Link to="/request" className="action-button secondary">
                            <span className="action-icon">📥</span>
                            Request a Resource
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section">
                <div className="stats-container">
                    <div className="stat-item">
                        <div className="stat-number">{stats.totalResources.toLocaleString()}</div>
                        <div className="stat-label">Resources Available</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">{stats.totalUsers.toLocaleString()}</div>
                        <div className="stat-label">Active Users</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">{stats.totalRequests}</div>
                        <div className="stat-label">Requests Fulfilled</div>
                    </div>
                </div>
            </section>

            {/* Recent Resources Section */}
            <section className="recent-resources">
                <div className="section-header">
                    <h2>Recently Added Resources</h2>
                    <Link to="/resources" className="view-all-link">View All Resources</Link>
                </div>

                <div className="resources-grid">
                    {recentResources.map((resource) => (
                        <ShareableResourceCard
                            key={resource._id}
                            resource={resource}
                            onSave={handleSaveResource}
                            onRemove={handleRemoveResource}
                            isSaved={savedResources.includes(resource._id)}
                            onViewDetails={handleResourceClick}
                        />
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="features-container">
                    <div className="feature-card">
                        <div className="feature-icon">🔍</div>
                        <h3>Smart Search</h3>
                        <p>Find resources with intelligent autocomplete and instant suggestions</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📚</div>
                        <h3>Curated Content</h3>
                        <p>Hand-picked resources verified by our community of educators</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🚀</div>
                        <h3>Fast Access</h3>
                        <p>Quick and easy access to learning materials when you need them</p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2>Can't Find What You're Looking For?</h2>
                    <p>Request a resource and our team will help you find it!</p>
                    <div className="cta-buttons">
                        <Link to="/request" className="cta-button primary">Request Resource</Link>
                        <Link to="/submit" className="cta-button secondary">Submit Resource</Link>
                    </div>
                </div>
            </section>

            {/* Modal */}
            {showModal && selectedResource && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedResource.title}</h3>
                            <button className="close-btn" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="resource-details">
                                {selectedResource.university && (
                                    <div className="detail-item">
                                        <strong>University:</strong> {selectedResource.university.name}
                                    </div>
                                )}
                                {selectedResource.domain && (
                                    <div className="detail-item">
                                        <strong>Domain:</strong> {selectedResource.domain.name}
                                    </div>
                                )}
                                {selectedResource.subject && (
                                    <div className="detail-item">
                                        <strong>Subject:</strong> {selectedResource.subject.name}
                                    </div>
                                )}
                                {selectedResource.skill && (
                                    <div className="detail-item">
                                        <strong>Skill:</strong> {selectedResource.skill}
                                    </div>
                                )}
                                {selectedResource.exam && (
                                    <div className="detail-item">
                                        <strong>Exam:</strong> {selectedResource.exam}
                                    </div>
                                )}
                                <div className="detail-item">
                                    <strong>Type:</strong> {selectedResource.type}
                                </div>
                                <div className="detail-item">
                                    <strong>Submitted by:</strong> {selectedResource.submittedBy?.name || 'Anonymous'}
                                </div>
                            </div>

                            <div className="description-section">
                                <h4>Description:</h4>
                                <p>{selectedResource.description}</p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="save-resource-btn"
                                onClick={() => {
                                    if (savedResources.includes(selectedResource._id)) {
                                        handleRemoveResource(selectedResource._id);
                                    } else {
                                        handleSaveResource(selectedResource);
                                    }
                                }}
                                disabled={!user}
                            >
                                {!user
                                    ? 'Login to Save'
                                    : savedResources.includes(selectedResource._id)
                                        ? 'Remove from Saved'
                                        : 'Save Resource'
                                }
                            </button>
                            <a
                                href={selectedResource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="save-resource-btn"
                                style={{
                                    background: '#007bff',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                    textAlign: 'center'
                                }}
                            >
                                Visit Resource
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;