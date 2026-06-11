import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
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

const DomainsTab = () => {
    const [domains, setDomains] = useState([]);
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingDomain, setEditingDomain] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        university_id: ''
    });

    useEffect(() => {
        fetchDomains();
        fetchUniversities();
    }, []);

    const fetchDomains = async () => {
        try {
            const { data, error } = await supabase
                .from('domains')
                .select(`
                    *,
                    universities (id, name),
                    subjects (id, name)
                `)
                .order('name');

            if (error) throw error;
            setDomains(data || []);
        } catch (err) {
            setError('Failed to fetch domains');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUniversities = async () => {
        try {
            const { data, error } = await supabase
                .from('universities')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setUniversities(data || []);
        } catch (err) {
            console.error('Error fetching universities:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const domainData = {
                name: formData.name.trim(),
                university_id: formData.university_id,
                updated_at: new Date().toISOString()
            };

            let result;
            if (editingDomain) {
                result = await supabase
                    .from('domains')
                    .update(domainData)
                    .eq('id', editingDomain.id);
            } else {
                domainData.created_at = new Date().toISOString();
                result = await supabase
                    .from('domains')
                    .insert([domainData]);
            }

            if (result.error) throw result.error;

            setSuccess(editingDomain ? 'Domain updated successfully' : 'Domain added successfully');
            setShowAddForm(false);
            setEditingDomain(null);
            setFormData({ name: '', university_id: '' });
            fetchDomains();
        } catch (err) {
            setError('Failed to save domain');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this domain? This will also delete all associated subjects.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('domains')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSuccess('Domain deleted successfully');
            fetchDomains();
        } catch (err) {
            setError('Failed to delete domain');
            console.error(err);
        }
    };

    const handleEdit = (domain) => {
        setEditingDomain(domain);
        setFormData({
            name: domain.name,
            university_id: domain.university_id
        });
        setShowAddForm(true);
    };

    const filteredDomains = domains.filter(domain =>
        !searchTerm ||
        domain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        domain.universities?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading domains...</span>
            </div>
        );
    }

    return (
        <div className="domains-tab">
            {/* Header */}
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
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={16} />
                            Add Domain
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
                            <h3>{editingDomain ? 'Edit Domain' : 'Add New Domain'}</h3>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingDomain(null);
                                    setFormData({ name: '', university_id: '' });
                                }}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
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
                                    {universities.map(university => (
                                        <option key={university.id} value={university.id}>
                                            {university.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editingDomain ? 'Update Domain' : 'Add Domain'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingDomain(null);
                                        setFormData({ name: '', university_id: '' });
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

            {/* Domains List */}
            <div className="domains-list">
                {filteredDomains.map((domain) => (
                    <div key={domain.id} className="domain-card">
                        <div className="domain-content">
                            <div className="domain-info">
                                <div className="domain-header">
                                    <GraduationCap size={24} className="domain-icon" />
                                    <div className="domain-title-section">
                                        <h3 className="domain-name">{domain.name}</h3>
                                        <div className="domain-university">
                                            <Building size={16} />
                                            <span>{domain.universities?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="domain-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Subjects:</span>
                                        <span className="stat-value">{domain.subjects?.length || 0}</span>
                                    </div>
                                </div>

                                {domain.subjects && domain.subjects.length > 0 && (
                                    <div className="domain-subjects">
                                        <h4>Subjects:</h4>
                                        <div className="subjects-list">
                                            {domain.subjects.map(subject => (
                                                <span key={subject.id} className="subject-tag">
                                                    {subject.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="domain-meta">
                                    <span>Created: {new Date(domain.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="domain-actions">
                                <button
                                    onClick={() => handleEdit(domain)}
                                    className="btn btn-secondary"
                                >
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(domain.id)}
                                    className="btn-deny"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredDomains.length === 0 && (
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