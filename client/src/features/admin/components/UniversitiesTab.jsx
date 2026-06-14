import React, { useState, useEffect } from 'react';
import { useUniversitiesTree } from '../../catalog/hooks/useCatalog';
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
    Building,
    Check,
    X
} from 'lucide-react';

const ENTITY = 'universities';

/** Catalog management for universities (create/edit/delete via /api/admin/catalog). */
const UniversitiesTab = () => {
    const { data: universities = [], isLoading } = useUniversitiesTree();
    const createItem = useCreateCatalogItem();
    const updateItem = useUpdateCatalogItem();
    const deleteItem = useDeleteCatalogItem();

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => { setSuccess(null); setError(null); }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const closeForm = () => {
        setShowAddForm(false);
        setEditing(null);
        setFormData({ name: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const body = { name: formData.name.trim() };
        try {
            if (editing) {
                await updateItem.mutateAsync({ entity: ENTITY, id: editing.id, body });
                setSuccess('University updated successfully');
            } else {
                await createItem.mutateAsync({ entity: ENTITY, body });
                setSuccess('University added successfully');
            }
            closeForm();
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to save university');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this university? Associated domains/subjects may be removed too.')) return;
        try {
            await deleteItem.mutateAsync({ entity: ENTITY, id });
            setSuccess('University deleted successfully');
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to delete university');
        }
    };

    const handleEdit = (university) => {
        setEditing(university);
        setFormData({ name: university.name });
        setShowAddForm(true);
    };

    const filtered = universities.filter((u) =>
        !searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading universities...</span>
            </div>
        );
    }

    return (
        <div className="universities-tab">
            <div className="page-header">
                <div className="page-header-content">
                    <div className="page-header-text">
                        <h2>Universities Management</h2>
                        <p>Manage universities in the system ({universities.length} total)</p>
                    </div>
                    <div className="page-header-actions">
                        <div className="search-container">
                            <Search size={20} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search universities..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
                            <Plus size={16} />
                            Add University
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
                            <h3>{editing ? 'Edit University' : 'Add New University'}</h3>
                            <button onClick={closeForm} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="name">University Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ name: e.target.value })}
                                    required
                                    className="form-input"
                                    placeholder="Enter university name"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editing ? 'Update University' : 'Add University'}
                                </button>
                                <button type="button" onClick={closeForm} className="btn btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="universities-list">
                {filtered.map((university) => (
                    <div key={university.id} className="university-card">
                        <div className="university-content">
                            <div className="university-info">
                                <div className="university-header">
                                    <Building size={24} className="university-icon" />
                                    <h3 className="university-name">{university.name}</h3>
                                </div>

                                <div className="university-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Domains:</span>
                                        <span className="stat-value">{university.domains?.length || 0}</span>
                                    </div>
                                </div>

                                {university.domains?.length > 0 && (
                                    <div className="university-domains">
                                        <h4>Domains:</h4>
                                        <div className="domains-list">
                                            {university.domains.map((domain) => (
                                                <span key={domain.id} className="domain-tag">
                                                    {domain.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="university-actions">
                                <button onClick={() => handleEdit(university)} className="btn btn-secondary">
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(university.id)} className="btn-deny">
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
                            <Building size={64} />
                        </div>
                        <h3 className="empty-resource-title">No universities found</h3>
                        <p className="empty-resource-subtitle">
                            {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first university'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UniversitiesTab;
