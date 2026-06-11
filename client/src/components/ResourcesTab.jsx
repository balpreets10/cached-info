import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    Eye,
    ExternalLink,
    X,
    Check
} from 'lucide-react';

const ResourcesTab = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [skills, setSkills] = useState([]);
    const [exams, setExams] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        url: '',
        subject_id: '',
        skill_id: '',
        exam_id: ''
    });

    useEffect(() => {
        fetchResources();
        fetchSubjects();
        fetchSkills();
        fetchExams();
    }, []);

    const fetchResources = async () => {
        try {
            const { data, error } = await supabase
                .from('resources')
                .select(`
                    *,
                    subjects (
                        name,
                        domains (
                            name,
                            universities (name)
                        )
                    ),
                    skills (name, skill_categories(name)),
                    exams (name, exam_categories(name))
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setResources(data || []);
        } catch (err) {
            setError('Failed to fetch resources');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('id, name, domains(name, universities(name))')
                .order('name');

            if (error) throw error;
            setSubjects(data || []);
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    };

    const fetchSkills = async () => {
        try {
            const { data, error } = await supabase
                .from('skills')
                .select('id, name, skill_categories(name)')
                .order('name');

            if (error) throw error;
            setSkills(data || []);
        } catch (err) {
            console.error('Error fetching skills:', err);
        }
    };

    const fetchExams = async () => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('id, name, exam_categories(name)')
                .order('name');

            if (error) throw error;
            setExams(data || []);
        } catch (err) {
            console.error('Error fetching exams:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const resourceData = {
                title: formData.title,
                description: formData.description,
                url: formData.url,
                is_approved: true,
                updated_at: new Date().toISOString()
            };

            // Add the appropriate foreign key
            if (formData.subject_id) {
                resourceData.subject_id = formData.subject_id;
            } else if (formData.skill_id) {
                resourceData.skill_id = formData.skill_id;
            } else if (formData.exam_id) {
                resourceData.exam_id = formData.exam_id;
            }

            let result;
            if (editingResource) {
                result = await supabase
                    .from('resources')
                    .update(resourceData)
                    .eq('id', editingResource.id);
            } else {
                resourceData.created_at = new Date().toISOString();
                result = await supabase
                    .from('resources')
                    .insert([resourceData]);
            }

            if (result.error) throw result.error;

            setSuccess(editingResource ? 'Resource updated successfully' : 'Resource added successfully');
            setShowAddForm(false);
            setEditingResource(null);
            setFormData({
                title: '',
                description: '',
                url: '',
                subject_id: '',
                skill_id: '',
                exam_id: ''
            });
            fetchResources();
        } catch (err) {
            setError('Failed to save resource');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this resource?')) return;

        try {
            const { error } = await supabase
                .from('resources')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSuccess('Resource deleted successfully');
            fetchResources();
        } catch (err) {
            setError('Failed to delete resource');
            console.error(err);
        }
    };

    const handleEdit = (resource) => {
        setEditingResource(resource);
        setFormData({
            title: resource.title,
            description: resource.description || '',
            url: resource.url || '',
            subject_id: resource.subject_id || '',
            skill_id: resource.skill_id || '',
            exam_id: resource.exam_id || ''
        });
        setShowAddForm(true);
    };

    const filteredResources = resources.filter(resource =>
        !searchTerm ||
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading resources...</span>
            </div>
        );
    }

    return (
        <div className="resources-tab">
            {/* Header */}
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
                        {/* <button className="btn btn-secondary">
                            <Filter size={16} />
                            Filter
                        </button> */}
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={16} />
                            Add Resource
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
                            <h3>{editingResource ? 'Edit Resource' : 'Add New Resource'}</h3>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingResource(null);
                                    setFormData({
                                        title: '',
                                        description: '',
                                        url: '',
                                        subject_id: '',
                                        skill_id: '',
                                        exam_id: ''
                                    });
                                }}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
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
                                <label htmlFor="url">URL</label>
                                <input
                                    type="url"
                                    id="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="subject_id">Subject (optional)</label>
                                <select
                                    id="subject_id"
                                    value={formData.subject_id}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        subject_id: e.target.value,
                                        skill_id: '',
                                        exam_id: ''
                                    })}
                                    className="form-input"
                                >
                                    <option value="">Select a subject</option>
                                    {subjects.map(subject => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name} ({subject.domains?.universities?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="skill_id">Skill (optional)</label>
                                <select
                                    id="skill_id"
                                    value={formData.skill_id}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        skill_id: e.target.value,
                                        subject_id: '',
                                        exam_id: ''
                                    })}
                                    className="form-input"
                                >
                                    <option value="">Select a skill</option>
                                    {skills.map(skill => (
                                        <option key={skill.id} value={skill.id}>
                                            {skill.name} ({skill.skill_categories?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="exam_id">Exam (optional)</label>
                                <select
                                    id="exam_id"
                                    value={formData.exam_id}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        exam_id: e.target.value,
                                        subject_id: '',
                                        skill_id: ''
                                    })}
                                    className="form-input"
                                >
                                    <option value="">Select an exam</option>
                                    {exams.map(exam => (
                                        <option key={exam.id} value={exam.id}>
                                            {exam.name} ({exam.exam_categories?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editingResource ? 'Update Resource' : 'Add Resource'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingResource(null);
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

            {/* Resources List */}
            <div className="resource-list">
                {filteredResources.map((resource) => (
                    <div key={resource.id} className="resource-card">
                        <div className="resource-content">
                            <div className="resource-info">
                                <div className="resource-header">
                                    <h3 className="resource-title">{resource.title}</h3>
                                    <span className={`status-badge ${resource.is_approved ? 'approved' : 'pending'}`}>
                                        {resource.is_approved ? 'Approved' : 'Pending'}
                                    </span>
                                </div>
                                <p className="resource-description">
                                    {resource.description || 'No description provided'}
                                </p>

                                {resource.url && (
                                    <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="resource-link"
                                    >
                                        <ExternalLink size={16} />
                                        View Resource
                                    </a>
                                )}

                                <div className="resource-tags">
                                    {resource.subjects && (
                                        <>
                                            <span className="resource-tag subject">
                                                📚 {resource.subjects.name}
                                            </span>
                                            {resource.subjects.domains && (
                                                <span className="resource-tag domain">
                                                    🎯 {resource.subjects.domains.name}
                                                </span>
                                            )}
                                            {resource.subjects.domains?.universities && (
                                                <span className="resource-tag university">
                                                    🏫 {resource.subjects.domains.universities.name}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {resource.skills && (
                                        <span className="resource-tag skill">
                                            💡 {resource.skills.name}
                                        </span>
                                    )}
                                    {resource.exams && (
                                        <span className="resource-tag exam">
                                            📝 {resource.exams.name}
                                        </span>
                                    )}
                                </div>

                                <div className="resource-meta">
                                    <span>Created: {new Date(resource.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="resource-actions">
                                <button
                                    onClick={() => handleEdit(resource)}
                                    className="btn btn-secondary"
                                >
                                    <Edit size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(resource.id)}
                                    className="btn-deny"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredResources.length === 0 && (
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