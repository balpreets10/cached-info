import React, { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  useResources,
  useSavedResources,
  useSaveResource,
  useUnsaveResource,
} from './hooks/useResources';
import { useUniversitiesTree } from '../catalog/hooks/useCatalog';
import './Resources.css';

const PAGE_SIZE = 12;

const Resources = () => {
  const { isAuthenticated } = useAuth();
  const { data: universities = [] } = useUniversitiesTree();

  const [filters, setFilters] = useState({ university: '', domain: '' });
  const [page, setPage] = useState(1);

  // Saved resources (logged-in only).
  const { data: saved = [] } = useSavedResources(isAuthenticated);
  const savedIds = useMemo(() => new Set(saved.map((r) => r.id)), [saved]);
  const saveResource = useSaveResource();
  const unsaveResource = useUnsaveResource();

  // Server-side filtering + pagination via the API.
  const params = {
    page,
    limit: PAGE_SIZE,
    ...(filters.university && { universityId: filters.university }),
    ...(filters.domain && { domainId: filters.domain }),
  };
  const { data: result, isLoading, error } = useResources(params);
  const resources = result?.data ?? [];
  const meta = result?.meta;
  const totalPages = meta?.totalPages ?? 1;

  // Domain options derive from the selected university's tree.
  const domainOptions = useMemo(() => {
    if (!filters.university) {
      // All domains across all universities.
      return universities.flatMap((u) =>
        (u.domains || []).map((d) => ({ _id: d.id, name: d.name })),
      );
    }
    const uni = universities.find((u) => u.id === filters.university);
    return (uni?.domains || []).map((d) => ({ _id: d.id, name: d.name }));
  }, [universities, filters.university]);

  // Modal
  const [selectedResource, setSelectedResource] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Reset domain when university changes.
      if (key === 'university') next.domain = '';
      return next;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ university: '', domain: '' });
    setPage(1);
  };

  const toggleSave = (resource) => {
    if (!isAuthenticated) {
      alert('Please login to save resources');
      return;
    }
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

  const handlePageChange = (next) => {
    setPage(next);
    document.querySelector('.content-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderUniversityDropdown = () => (
    <div className="filter-dropdown">
      <label>University</label>
      <select
        value={filters.university}
        onChange={(e) => handleFilterChange('university', e.target.value)}
      >
        <option value="">Select University</option>
        {universities.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
  );

  const renderDomainDropdown = () => (
    <div className="filter-dropdown">
      <label>Domain</label>
      <select
        value={filters.domain}
        onChange={(e) => handleFilterChange('domain', e.target.value)}
      >
        <option value="">Select Domain</option>
        {domainOptions.map((d) => (
          <option key={d._id} value={d._id}>{d.name}</option>
        ))}
      </select>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);

    return (
      <div className="pagination">
        <button className="pagination-btn" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
          ‹ Previous
        </button>
        {pageNumbers.map((p) => (
          <button
            key={p}
            className={`pagination-btn ${page === p ? 'active' : ''}`}
            onClick={() => handlePageChange(p)}
          >
            {p}
          </button>
        ))}
        <button className="pagination-btn" onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
          Next ›
        </button>
      </div>
    );
  };

  const renderResources = () => {
    if (isLoading) return <div className="loading">Loading resources...</div>;
    if (error) return <div className="error">Error loading resources. Please try again.</div>;
    if (resources.length === 0) {
      return <p className="no-data">No resources found. Please adjust filters above.</p>;
    }

    return (
      <>
        {meta && (
          <div className="resources-info">
            <p>{meta.total} resource{meta.total === 1 ? '' : 's'} found</p>
          </div>
        )}

        <div className="resources-grid">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="resource-card"
              onClick={() => handleResourceClick(resource)}
            >
              <div className="card-header">
                <div className="resource-type-badge">{resource.type}</div>
                <div className="card-actions">
                  {isAuthenticated && (
                    <button
                      className="save-btn"
                      onClick={(e) => { e.stopPropagation(); toggleSave(resource); }}
                      title={savedIds.has(resource.id) ? 'Remove from saved' : 'Save resource'}
                    >
                      {savedIds.has(resource.id) ? '❤️' : '🤍'}
                    </button>
                  )}
                </div>
              </div>

              <div className="card-content">
                <h4 className="resource-title">{resource.title}</h4>
                <p className="resource-description">{resource.description}</p>

                <div className="resource-meta">
                  {resource.university && <span className="meta-item">🏫 {resource.university.name}</span>}
                  {resource.domain && <span className="meta-item">📚 {resource.domain.name}</span>}
                  {resource.subject && <span className="meta-item">📖 {resource.subject.name}</span>}
                  {resource.skill && <span className="meta-item">💻 {resource.skill.name}</span>}
                  {resource.exam && <span className="meta-item">📝 {resource.exam.name}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {renderPagination()}
      </>
    );
  };

  return (
    <div className="resources-container">
      <div className="resources-header">
        <h1>Learning Resources</h1>
        <p>Find resources tailored to your academic needs</p>
      </div>

      <div className="filters-section">
        <h2>Filter Resources</h2>
        <div className="filters-grid">
          {renderUniversityDropdown()}
          {renderDomainDropdown()}
        </div>
        <button onClick={clearFilters} className="clear-filters-btn">Clear All Filters</button>
      </div>

      <section className="content-section">
        <h2>Available Resources</h2>
        {renderResources()}
      </section>

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
                  <div className="detail-item"><strong>University:</strong> {selectedResource.university.name}</div>
                )}
                {selectedResource.domain && (
                  <div className="detail-item"><strong>Domain:</strong> {selectedResource.domain.name}</div>
                )}
                {selectedResource.subject && (
                  <div className="detail-item"><strong>Subject:</strong> {selectedResource.subject.name}</div>
                )}
                {selectedResource.skill && (
                  <div className="detail-item"><strong>Skill:</strong> {selectedResource.skill.name}</div>
                )}
                {selectedResource.exam && (
                  <div className="detail-item"><strong>Exam:</strong> {selectedResource.exam.name}</div>
                )}
                <div className="detail-item"><strong>Type:</strong> {selectedResource.type}</div>
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

export default Resources;
