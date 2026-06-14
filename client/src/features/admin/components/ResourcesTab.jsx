import React, { useState, useEffect } from 'react';
import { useResources } from '../../resources/hooks/useResources';
import { useCatalog } from '../../catalog/hooks/useCatalog';
import {
    useAdminCreateResource,
    useAdminUpdateResource,
    useAdminDeleteResource,
} from '../hooks/useAdmin';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    ExternalLink,
    X,
    Check
} from 'lucide-react';

const EMPTY = { title: '', description: '', url: '', subject_id: '', skill_id: '', exam_id: '' };

/**
 * Manage approved resources (create/edit/delete via the management API).
 * Pending submissions are handled in the Pending Review tab.
 */
const ResourcesTab = () => {
    // Show a generous page of approved resources for management.
    const { data: result, isLoading } = useResources({ limit: 100 });
    const resources = result?.data ?? [];

    const { data: subjects = [] } = useCatalog('subjects');
    const { data: skills = [] } = useCatalog('skills');
    const { data: exams = [] } = useCatalog('exams');

    const createResource = useAdminCreateResource();
    const updateResource = useAdminUpdateResource();
    const deleteResource = useAdminDeleteResource();

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState(EMPTY);
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
        setFormData(EMPTY);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Build the API body with exactly one parent id.
        const body = { title: formData.title, url: formData.url };
        if (formData.description) body.description = formData.description;
        if (formData.subject_id) body.subjectId = formData.subject_id;
        else if (formData.skill_id) body.skillId = formData.skill_id;
        else if (formData.exam_id) body.examId = formData.exam_id;

        try {
            if (editing) {
                await updateResource.mutateAsync({ id: editing.id, body });
                setSuccess('Resource updated successfully');
            } else {
                await createResource.mutateAsync(body);
                setSuccess('Resource added successfully');
            }
            closeForm();
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to save resource');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this resource?')) return;
        try {
            await deleteResource.mutateAsync(id);
            setSuccess('Resource deleted successfully');
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to delete resource');
        }
    };

    const handleEdit = (resource) => {
        setEditing(resource);
        setFormData({
            title: resource.title,
            description: resource.description || '',
            url: resource.url || '',
            subject_id: resource.subject?.id || '',
            skill_id: resource.skill?.id || '',
            exam_id: resource.exam?.id || '',
        });
        setShowAddForm(true);
    };

    const filtered = resources.filter((r) =>
        !searchTerm ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading resources...</span>
            </div>
        );
    }

    return (
        <div className="resources-tab">
            <div className="page-header">
                <div className="page-header-content">
                    <div className="page-header-text">
                        <h2>Resources Management</h2>
                        <p>Manage all approved resources in the system</p>
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
                        <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
                            <Plus size={16} />
                            Add Resource
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
                            <h3>{editing ? 'Edit Resource' : 'Add New Resource'}</h3>
                            <button onClick={closeForm} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="title">Title *</label>
                                <input
                                    type="text"
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="url">URL *</label>
                                <input
                                    type="url"
                                    id="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="subject_id">Subject (pick one category)</label>
                                <select
                                    id="subject_id"
                                    value={formData.subject_id}
                                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value, skill_id: '', exam_id: '' })}
                                    className="form-input"
                                >
                                    <option value="">Select a subject</option>
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="skill_id">Skill</label>
                                <select
                                    id="skill_id"
                                    value={formData.skill_id}
                                    onChange={(e) => setFormData({ ...formData, skill_id: e.target.value, subject_id: '', exam_id: '' })}
                                    className="form-input"
                                >
                                    <option value="">Select a skill</option>
                                    {skills.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="exam_id">Exam</label>
                                <select
                                    id="exam_id"
                                    value={formData.exam_id}
                                    onChange={(e) => setFormData({ ...formData, exam_id: e.target.value, subject_id: '', skill_id: '' })}
                                    className="form-input"
                                >
                                    <option value="">Select an exam</option>
                                    {exams.map((ex) => (
                                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editing ? 'Update Resource' : 'Add Resource'}
                                </button>
                                <button type="button" onClick={closeForm} className="btn btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="resource-list">
                {filtered.map((resource) => (
                    <div key={resource.id} className="resource-card">
                        <div className="resource-content">
                            <div className="resource-info">
                                <div className="resource-header">
                                    <h3 className="resource-title">{resource.title}</h3>
                                    <span className="status-badge approved">Approved</span>
                                </div>
                                <p className="resource-description">
                                    {resource.description || 'No description provided'}
                                </p>

                                {resource.url && (
                                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                                        <ExternalLink size={16} />
                                        View Resource
                                    </a>
                                )}

                                <div className="resource-tags">
                                    {resource.subject && <span className="resource-tag subject">📚 {resource.subject.name}</span>}
                                    {resource.domain && <span className="resource-tag domain">🎯 {resource.domain.name}</span>}
                                    {resource.university && <span className="resource-tag university">🏫 {resource.university.name}</span>}
                                    {resource.skill && <span className="resource-tag skill">💡 {resource.skill.name}</span>}
                                    {resource.exam && <span className="resource-tag exam">📝 {resource.exam.name}</span>}
                                </div>
                            </div>

                            <div className="resource-actions">
                                <button onClick={() => handleEdit(resource)} className="btn btn-secondary">
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(resource.id)} className="btn-deny">
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
                            <Eye size={64} />
                        </div>
                        <h3 className="empty-resource-title">No resources found</h3>
                        <p className="empty-resource-subtitle">
                            {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first resource'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourcesTab;
