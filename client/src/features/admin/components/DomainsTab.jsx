import React, { useState, useEffect, useMemo } from 'react';
import { useCatalog, useUniversitiesTree } from '../../catalog/hooks/useCatalog';
import {
    useCreateCatalogItem,
    useUpdateCatalogItem,
    useDeleteCatalogItem,
} from '../hooks/useAdmin';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    GraduationCap,
    Building,
    Check,
    X
} from 'lucide-react';

const ENTITY = 'domains';

/** Catalog management for domains (belongs to a university). */
const DomainsTab = () => {
    const { data: domains = [], isLoading } = useCatalog(ENTITY);
    const { data: universities = [] } = useUniversitiesTree();
    const createItem = useCreateCatalogItem();
    const updateItem = useUpdateCatalogItem();
    const deleteItem = useDeleteCatalogItem();

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '', university_id: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Map university id → name for display (flat domains list has no join).
    const uniNameById = useMemo(() => {
        const map = {};
        universities.forEach((u) => { map[u.id] = u.name; });
        return map;
    }, [universities]);

    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => { setSuccess(null); setError(null); }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const closeForm = () => {
        setShowAddForm(false);
        setEditing(null);
        setFormData({ name: '', university_id: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const body = { name: formData.name.trim(), university_id: formData.university_id };
        try {
            if (editing) {
                await updateItem.mutateAsync({ entity: ENTITY, id: editing.id, body });
                setSuccess('Domain updated successfully');
            } else {
                await createItem.mutateAsync({ entity: ENTITY, body });
                setSuccess('Domain added successfully');
            }
            closeForm();
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to save domain');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this domain? Associated subjects may be removed too.')) return;
        try {
            await deleteItem.mutateAsync({ entity: ENTITY, id });
            setSuccess('Domain deleted successfully');
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to delete domain');
        }
    };

    const handleEdit = (domain) => {
        setEditing(domain);
        setFormData({ name: domain.name, university_id: domain.university_id });
        setShowAddForm(true);
    };

    const filtered = domains.filter((d) =>
        !searchTerm ||
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (uniNameById[d.university_id] || '').toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading domains...</span>
            </div>
        );
    }

    return (
        <div className="domains-tab">
            <div className="page-header">
                <div className="page-header-content">
                    <div className="page-header-text">
                        <h2>Domains Management</h2>
                        <p>Manage academic domains within universities ({domains.length} total)</p>
                    </div>
                    <div className="page-header-actions">
                        <div className="search-container">
                            <Search size={20} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search domains..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
                            <Plus size={16} />
                            Add Domain
                        </button>
                    </div>
                </div>
            </div>

            {success && <div className="notification success"><Check size={16} />{success}</div>}
            {error && <div className="notification error"><X size={16} />{error}</div>}

            {showAddForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editing ? 'Edit Domain' : 'Add New Domain'}</h3>
                            <button onClick={closeForm} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="name">Domain Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="form-input"
                                    placeholder="Enter domain name (e.g., Engineering, Medicine)"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="university_id">University *</label>
                                <select
                                    id="university_id"
                                    value={formData.university_id}
                                    onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
                                    required
                                    className="form-input"
                                >
                                    <option value="">Select a university</option>
                                    {universities.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editing ? 'Update Domain' : 'Add Domain'}
                                </button>
                                <button type="button" onClick={closeForm} className="btn btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="domains-list">
                {filtered.map((domain) => (
                    <div key={domain.id} className="domain-card">
                        <div className="domain-content">
                            <div className="domain-info">
                                <div className="domain-header">
                                    <GraduationCap size={24} className="domain-icon" />
                                    <div className="domain-title-section">
                                        <h3 className="domain-name">{domain.name}</h3>
                                        <div className="domain-university">
                                            <Building size={16} />
                                            <span>{uniNameById[domain.university_id] || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="domain-actions">
                                <button onClick={() => handleEdit(domain)} className="btn btn-secondary">
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(domain.id)} className="btn-deny">
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="empty-resource-state">
                        <div className="empty-resource-icon">
                            <GraduationCap size={64} />
                        </div>
                        <h3 className="empty-resource-title">No domains found</h3>
                        <p className="empty-resource-subtitle">
                            {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first domain'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DomainsTab;
