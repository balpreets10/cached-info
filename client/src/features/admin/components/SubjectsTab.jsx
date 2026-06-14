import React, { useState, useEffect, useMemo } from 'react';
import { useCatalog } from '../../catalog/hooks/useCatalog';
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
    BookOpen,
    GraduationCap,
    Check,
    X
} from 'lucide-react';

const ENTITY = 'subjects';

/** Catalog management for subjects (belongs to a domain). */
const SubjectsTab = () => {
    const { data: subjects = [], isLoading } = useCatalog(ENTITY);
    const { data: domains = [] } = useCatalog('domains');
    const createItem = useCreateCatalogItem();
    const updateItem = useUpdateCatalogItem();
    const deleteItem = useDeleteCatalogItem();

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '', domain_id: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const domainNameById = useMemo(() => {
        const map = {};
        domains.forEach((d) => { map[d.id] = d.name; });
        return map;
    }, [domains]);

    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => { setSuccess(null); setError(null); }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const closeForm = () => {
        setShowAddForm(false);
        setEditing(null);
        setFormData({ name: '', domain_id: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const body = { name: formData.name.trim(), domain_id: formData.domain_id };
        try {
            if (editing) {
                await updateItem.mutateAsync({ entity: ENTITY, id: editing.id, body });
                setSuccess('Subject updated successfully');
            } else {
                await createItem.mutateAsync({ entity: ENTITY, body });
                setSuccess('Subject added successfully');
            }
            closeForm();
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to save subject');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this subject? Associated resources may be affected.')) return;
        try {
            await deleteItem.mutateAsync({ entity: ENTITY, id });
            setSuccess('Subject deleted successfully');
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to delete subject');
        }
    };

    const handleEdit = (subject) => {
        setEditing(subject);
        setFormData({ name: subject.name, domain_id: subject.domain_id });
        setShowAddForm(true);
    };

    const filtered = subjects.filter((s) =>
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (domainNameById[s.domain_id] || '').toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading subjects...</span>
            </div>
        );
    }

    return (
        <div className="subjects-tab">
            <div className="page-header">
                <div className="page-header-content">
                    <div className="page-header-text">
                        <h2>Subjects Management</h2>
                        <p>Manage academic subjects within domains ({subjects.length} total)</p>
                    </div>
                    <div className="page-header-actions">
                        <div className="search-container">
                            <Search size={20} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search subjects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
                            <Plus size={16} />
                            Add Subject
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
                            <h3>{editing ? 'Edit Subject' : 'Add New Subject'}</h3>
                            <button onClick={closeForm} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="name">Subject Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="form-input"
                                    placeholder="Enter subject name (e.g., Computer Science, Physics)"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="domain_id">Domain *</label>
                                <select
                                    id="domain_id"
                                    value={formData.domain_id}
                                    onChange={(e) => setFormData({ ...formData, domain_id: e.target.value })}
                                    required
                                    className="form-input"
                                >
                                    <option value="">Select a domain</option>
                                    {domains.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editing ? 'Update Subject' : 'Add Subject'}
                                </button>
                                <button type="button" onClick={closeForm} className="btn btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="subjects-list">
                {filtered.map((subject) => (
                    <div key={subject.id} className="subject-card">
                        <div className="subject-content">
                            <div className="subject-info">
                                <div className="subject-header">
                                    <BookOpen size={24} className="subject-icon" />
                                    <div className="subject-title-section">
                                        <h3 className="subject-name">{subject.name}</h3>
                                        <div className="subject-hierarchy">
                                            <div className="hierarchy-item">
                                                <GraduationCap size={14} />
                                                <span>{domainNameById[subject.domain_id] || '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="subject-actions">
                                <button onClick={() => handleEdit(subject)} className="btn btn-secondary">
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(subject.id)} className="btn-deny">
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
                            <BookOpen size={64} />
                        </div>
                        <h3 className="empty-resource-title">No subjects found</h3>
                        <p className="empty-resource-subtitle">
                            {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first subject'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectsTab;
