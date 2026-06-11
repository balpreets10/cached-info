import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    BookOpen,
    GraduationCap,
    Building,
    Check,
    X
} from 'lucide-react';

const SubjectsTab = () => {
    const [subjects, setSubjects] = useState([]);
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        domain_id: ''
    });

    useEffect(() => {
        fetchSubjects();
        fetchDomains();
    }, []);

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select(`
                    *,
                    domains (
                        id,
                        name,
                        universities (id, name)
                    )
                `)
                .order('name');

            if (error) throw error;
            setSubjects(data || []);
        } catch (err) {
            setError('Failed to fetch subjects');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDomains = async () => {
        try {
            const { data, error } = await supabase
                .from('domains')
                .select('id, name, universities(name)')
                .order('name');

            if (error) throw error;
            setDomains(data || []);
        } catch (err) {
            console.error('Error fetching domains:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const subjectData = {
                name: formData.name.trim(),
                domain_id: formData.domain_id,
                updated_at: new Date().toISOString()
            };

            let result;
            if (editingSubject) {
                result = await supabase
                    .from('subjects')
                    .update(subjectData)
                    .eq('id', editingSubject.id);
            } else {
                subjectData.created_at = new Date().toISOString();
                result = await supabase
                    .from('subjects')
                    .insert([subjectData]);
            }

            if (result.error) throw result.error;

            setSuccess(editingSubject ? 'Subject updated successfully' : 'Subject added successfully');
            setShowAddForm(false);
            setEditingSubject(null);
            setFormData({ name: '', domain_id: '' });
            fetchSubjects();
        } catch (err) {
            setError('Failed to save subject');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this subject? This will also delete all associated resources.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('subjects')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSuccess('Subject deleted successfully');
            fetchSubjects();
        } catch (err) {
            setError('Failed to delete subject');
            console.error(err);
        }
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            domain_id: subject.domain_id
        });
        setShowAddForm(true);
    };

    const filteredSubjects = subjects.filter(subject =>
        !searchTerm ||
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.domains?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.domains?.universities?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading subjects...</span>
            </div>
        );
    }

    return (
        <div className="subjects-tab">
            {/* Header */}
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
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={16} />
                            Add Subject
                        </button>
                    </div>
                </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="notification success">
                    <Check size={16} />
                    {success}
                </div>
            )}
            {error && (
                <div className="notification error">
                    <X size={16} />
                    {error}
                </div>
            )}

            {/* Add/Edit Form Modal */}
            {showAddForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingSubject(null);
                                    setFormData({ name: '', domain_id: '' });
                                }}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
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
                                    {domains.map(domain => (
                                        <option key={domain.id} value={domain.id}>
                                            {domain.name} ({domain.universities?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editingSubject ? 'Update Subject' : 'Add Subject'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingSubject(null);
                                        setFormData({ name: '', domain_id: '' });
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Subjects List */}
            <div className="subjects-list">
                {filteredSubjects.map((subject) => (
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
                                                <span>{subject.domains?.name}</span>
                                            </div>
                                            <div className="hierarchy-item">
                                                <Building size={14} />
                                                <span>{subject.domains?.universities?.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="subject-meta">
                                    <span>Created: {new Date(subject.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="subject-actions">
                                <button
                                    onClick={() => handleEdit(subject)}
                                    className="btn btn-secondary"
                                >
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(subject.id)}
                                    className="btn-deny"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredSubjects.length === 0 && (
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