import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  useResources,
  useSearchResources,
  useSavedResources,
  useSaveResource,
  useUnsaveResource,
} from './hooks/useResources';
import { useUniversitiesTree } from '../catalog/hooks/useCatalog';
import ShareableResourceCard from './components/ShareableResourceCard';
import './HomePage.css';

/** Build autocomplete suggestions from the catalog tree + recent resources. */
function buildSearchableTerms(universities = [], recent = []) {
  const seen = new Set();
  const terms = [];
  const add = (text, type, category) => {
    if (!text) return;
    const key = `${type}:${text.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    terms.push({ text, type, category });
  };

  universities.forEach((u) => {
    add(u.name, 'university', '🏫 University');
    (u.domains || []).forEach((d) => {
      add(d.name, 'domain', '🎯 Domain');
      (d.subjects || []).forEach((s) => add(s.name, 'subject', '📖 Subject'));
    });
  });

  recent.forEach((r) => {
    if (r.skill?.name) add(r.skill.name, 'skill', '💡 Skill');
    if (r.exam?.name) add(r.exam.name, 'exam', '📚 Exam');
  });

  return terms;
}

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  // Recent resources (first page, newest first as returned by the API).
  const { data: recentList } = useResources({ limit: 6 });
  const recentResources = useMemo(() => recentList?.data ?? [], [recentList]);

  // Catalog tree powers the autocomplete suggestions.
  const { data: universities = [] } = useUniversitiesTree();

  // Saved resources (only when logged in).
  const { data: saved = [] } = useSavedResources(isAuthenticated);
  const savedIds = useMemo(() => new Set(saved.map((r) => r.id)), [saved]);
  const saveResource = useSaveResource();
  const unsaveResource = useUnsaveResource();

  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Modal state
  const [selectedResource, setSelectedResource] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Server-side trigram search, fired on submit (not per keystroke).
  const { data: searchResults = [], isFetching: isSearching } =
    useSearchResources(submittedQuery, 5);

  const allSearchableTerms = useMemo(
    () => buildSearchableTerms(universities, recentResources),
    [universities, recentResources],
  );

  // Local autocomplete as the user types.
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = allSearchableTerms
        .filter((t) => t.text.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 8);
      setAutocompleteResults(filtered);
      setShowAutocomplete(true);
    } else {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }
  }, [searchQuery, allSearchableTerms]);

  // Close autocomplete on outside click.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSave = (resource) => {
    if (!isAuthenticated) return;
    if (savedIds.has(resource.id)) {
      unsaveResource.mutate(resource.id);
    } else {
      saveResource.mutate(resource.id);
    }
  };

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
    setShowAutocomplete(false);
    setSubmittedQuery(searchQuery.trim());
  };

  const handleSearchInputChange = (e) => setSearchQuery(e.target.value);

  const handleAutocompleteSelect = (term) => {
    setSearchQuery(term.text);
    setShowAutocomplete(false);
    setSubmittedQuery(term.text);
    searchInputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (searchQuery.trim().length > 0) setShowAutocomplete(true);
  };

  const showResults = searchResults.length > 0 && !showAutocomplete && submittedQuery;

  return (
    <div className="homepage">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover Learning Resources
            <span className="highlight"> That Matter</span>
          </h1>
          <p className="hero-subtitle">
            Find the best educational resources for your academic journey. From university
            materials to skill development, we've got you covered.
          </p>

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

            {showAutocomplete && autocompleteResults.length > 0 && (
              <div className="autocomplete-dropdown">
                {autocompleteResults.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleAutocompleteSelect(suggestion)}
                    className="autocomplete-item"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleAutocompleteSelect(suggestion);
                    }}
                  >
                    <div className="autocomplete-text">{suggestion.text}</div>
                    <div className="autocomplete-category">{suggestion.category}</div>
                  </div>
                ))}
              </div>
            )}

            {showResults && (
              <div className="search-results">
                <div className="search-results-header">🔍 Search Results</div>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="search-result-item"
                    onClick={() => {
                      setSubmittedQuery('');
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
                      <p>{(result.description || '').substring(0, 80)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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

      {/* Recent resources */}
      <section className="recent-resources">
        <div className="section-header">
          <h2>Recently Added Resources</h2>
          <Link to="/resources" className="view-all-link">View All Resources</Link>
        </div>

        <div className="resources-grid">
          {recentResources.map((resource) => (
            <ShareableResourceCard
              key={resource.id}
              resource={resource}
              onSave={() => toggleSave(resource)}
              onRemove={() => toggleSave(resource)}
              isSaved={savedIds.has(resource.id)}
              onViewDetails={handleResourceClick}
            />
          ))}
        </div>
      </section>

      {/* Features */}
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

      {/* CTA */}
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
                    <strong>Skill:</strong> {selectedResource.skill.name}
                  </div>
                )}
                {selectedResource.exam && (
                  <div className="detail-item">
                    <strong>Exam:</strong> {selectedResource.exam.name}
                  </div>
                )}
                <div className="detail-item">
                  <strong>Type:</strong> {selectedResource.type}
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
                onClick={() => toggleSave(selectedResource)}
                disabled={!isAuthenticated}
              >
                {!isAuthenticated
                  ? 'Login to Save'
                  : savedIds.has(selectedResource.id)
                    ? 'Remove from Saved'
                    : 'Save Resource'}
              </button>
              <a
                href={selectedResource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="save-resource-btn"
                style={{ background: '#007bff', textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
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
