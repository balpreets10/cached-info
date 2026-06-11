import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Building,
    Check,
    X
} from 'lucide-react';

const UniversitiesTab = () => {
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUniversity, setEditingUniversity] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [formData, setFormData] = useState({
        name: ''
    });

    useEffect(() => {
        fetchUniversities();
    }, []);

    const fetchUniversities = async () => {
        try {
            const { data, error } = await supabase
                .from('universities')
                .select(`
                    *,
                    domains (
                        id,
                        name,
                        subjects (id, name)
                    )
                `)
                .order('name');

            if (error) throw error;
            setUniversities(data || []);
        } catch (err) {
            setError('Failed to fetch universities');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const universityData = {
                name: formData.name.trim(),
                updated_at: new Date().toISOString()
            };

            let result;
            if (editingUniversity) {
                result = await supabase
                    .from('universities')
                    .update(universityData)
                    .eq('id', editingUniversity.id);
            } else {
                universityData.created_at = new Date().toISOString();
                result = await supabase
                    .from('universities')
                    .insert([universityData]);
            }

            if (result.error) throw result.error;

            setSuccess(editingUniversity ? 'University updated successfully' : 'University added successfully');
            setShowAddForm(false);
            setEditingUniversity(null);
            setFormData({ name: '' });
            fetchUniversities();
        } catch (err) {
            setError('Failed to save university');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this university? This will also delete all associated domains and subjects.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('universities')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSuccess('University deleted successfully');
            fetchUniversities();
        } catch (err) {
            setError('Failed to delete university');
            console.error(err);
        }
    };

    const handleEdit = (university) => {
        setEditingUniversity(university);
        setFormData({
            name: university.name
        });
        setShowAddForm(true);
    };

    const filteredUniversities = universities.filter(university =>
        !searchTerm ||
        university.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading universities...</span>
            </div>
        );
    }

    return (
        <div className="universities-tab">
            {/* Header */}
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
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={16} />
                            Add University
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
                            <h3>{editingUniversity ? 'Edit University' : 'Add New University'}</h3>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingUniversity(null);
                                    setFormData({ name: '' });
                                }}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="name">University Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="form-input"
                                    placeholder="Enter university name"
                                />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editingUniversity ? 'Update University' : 'Add University'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingUniversity(null);
                                        setFormData({ name: '' });
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

            {/* Universities List */}
            <div className="universities-list">
                {filteredUniversities.map((university) => (
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
                                    <div className="stat-item">
                                        <span className="stat-label">Subjects:</span>
                                        <span className="stat-value">
                                            {university.domains?.reduce((total, domain) =>
                                                total + (domain.subjects?.length || 0), 0
                                            ) || 0}
                                        </span>
                                    </div>
                                </div>

                                {university.domains && university.domains.length > 0 && (
                                    <div className="university-domains">
                                        <h4>Domains:</h4>
                                        <div className="domains-list">
                                            {university.domains.map(domain => (
                                                <span key={domain.id} className="domain-tag">
                                                    {domain.name} ({domain.subjects?.length || 0} subjects)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="university-meta">
                                    <span>Created: {new Date(university.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="university-actions">
                                <button
                                    onClick={() => handleEdit(university)}
                                    className="btn btn-secondary"
                                >
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(university.id)}
                                    className="btn-deny"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredUniversities.length === 0 && (
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