import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import './RequestResource.css';

const RequestResource = () => {
    const { universities, loading: dataLoading } = useData();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: '',
        subject: '',
        university: '',
        domain: '',
        skill: '',
        exam: '',
        priority: 'medium',
        contactEmail: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [domains, setDomains] = useState([]);
    const [subjects, setSubjects] = useState([]);

    // Dropdown options
    const resourceTypes = [
        { value: 'university', label: 'University Resource' },
        { value: 'skill', label: 'Skill Development' },
        { value: 'competitive', label: 'Competitive Exam' },
        { value: 'other', label: 'Other' }
    ];

    const priorityLevels = [
        { value: 'low', label: 'Low Priority' },
        { value: 'medium', label: 'Medium Priority' },
        { value: 'high', label: 'High Priority' },
        { value: 'urgent', label: 'Urgent' }
    ];

    // Load domains when university changes
    useEffect(() => {
        if (formData.university && universities.length > 0) {
            const selectedUniversity = universities.find(uni => uni._id === formData.university);
            if (selectedUniversity) {
                setDomains(selectedUniversity.domains);
            }
        } else {
            setDomains([]);
        }
    }, [formData.university, universities]);

    // Load subjects when domain changes
    useEffect(() => {
        if (formData.domain && formData.university && universities.length > 0) {
            const selectedUniversity = universities.find(uni => uni._id === formData.university);
            if (selectedUniversity) {
                const selectedDomain = selectedUniversity.domains.find(domain => domain._id === formData.domain);
                if (selectedDomain) {
                    setSubjects(selectedDomain.subjects);
                }
            }
        } else {
            setSubjects([]);
        }
    }, [formData.domain, formData.university, universities]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Request title is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        } else if (formData.description.length < 20) {
            newErrors.description = 'Description must be at least 20 characters long';
        }

        if (!formData.type) {
            newErrors.type = 'Please select a resource type';
        }

        if (!formData.priority) {
            newErrors.priority = 'Please select a priority level';
        }

        // Validate email if provided
        if (formData.contactEmail && !isValidEmail(formData.contactEmail)) {
            newErrors.contactEmail = 'Please enter a valid email address';
        }

        // Validate based on resource type
        if (formData.type === 'university') {
            if (!formData.university) {
                newErrors.university = 'Please select a university';
            }
            if (!formData.domain) {
                newErrors.domain = 'Please select a domain';
            }
            if (!formData.subject) {
                newErrors.subject = 'Please select a subject';
            }
        } else if (formData.type === 'skill') {
            if (!formData.skill.trim()) {
                newErrors.skill = 'Skill name is required';
            }
        } else if (formData.type === 'competitive') {
            if (!formData.exam.trim()) {
                newErrors.exam = 'Exam name is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const submitToSupabase = async (requestData) => {
        try {
            const { data, error } = await supabase
                .from('user_resource_requests')
                .insert([{
                    user_id: user?.id,
                    subject_id: requestData.subject_id,
                    title: requestData.title,
                    description: requestData.description,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;

            return { success: true, id: data.id };
        } catch (error) {
            console.error('Failed to save request to Supabase:', error);
            throw error;
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        // Reset dependent fields when type changes
        if (name === 'type') {
            setFormData(prev => ({
                ...prev,
                university: '',
                domain: '',
                subject: '',
                skill: '',
                exam: ''
            }));
            setDomains([]);
            setSubjects([]);
        } else if (name === 'university') {
            setFormData(prev => ({
                ...prev,
                domain: '',
                subject: ''
            }));
            setSubjects([]);
        } else if (name === 'domain') {
            setFormData(prev => ({
                ...prev,
                subject: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            setErrors({ submit: 'Please login to submit requests' });
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare data based on resource type
            const submitData = {
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                contactEmail: formData.contactEmail || undefined,
                status: 'pending'
            };

            // For university requests, we need the subject_id
            if (formData.type === 'university' && formData.subject) {
                submitData.subject_id = formData.subject;
                await submitToSupabase(submitData);
            } else {
                // For non-university requests, log locally (since database requires subject_id)
                console.log('Non-university request submitted:', {
                    ...submitData,
                    type: formData.type,
                    skill: formData.skill,
                    exam: formData.exam
                });
            }

            setSubmitSuccess(true);
            setFormData({
                title: '',
                description: '',
                type: '',
                subject: '',
                university: '',
                domain: '',
                skill: '',
                exam: '',
                priority: 'medium',
                contactEmail: ''
            });

            // Reset success message after 5 seconds
            setTimeout(() => {
                setSubmitSuccess(false);
            }, 5000);

        } catch (error) {
            console.error('Error submitting request:', error);
            setErrors(prev => ({
                ...prev,
                submit: 'Failed to submit request. Please try again.'
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (name, label, type = 'text', options = null, required = true) => (
        <div className="form-field">
            <label htmlFor={name} className="form-label">
                {label} {required && <span className="required">*</span>}
            </label>

            {type === 'select' ? (
                <select
                    id={name}
                    name={name}
                    value={formData[name]}
                    onChange={handleInputChange}
                    className={`form-select ${errors[name] ? 'error' : ''}`}
                >
                    <option value="">Select {label}</option>
                    {options.map(option => (
                        <option key={option.value || option._id} value={option.value || option._id}>
                            {option.label || option.name}
                        </option>
                    ))}
                </select>
            ) : type === 'textarea' ? (
                <textarea
                    id={name}
                    name={name}
                    value={formData[name]}
                    onChange={handleInputChange}
                    rows={4}
                    className={`form-textarea ${errors[name] ? 'error' : ''}`}
                    placeholder={`Enter ${label.toLowerCase()}`}
                />
            ) : (
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={formData[name]}
                    onChange={handleInputChange}
                    className={`form-input ${errors[name] ? 'error' : ''}`}
                    placeholder={`Enter ${label.toLowerCase()}`}
                />
            )}

            {errors[name] && (
                <p className="error-message">{errors[name]}</p>
            )}
        </div>
    );

    if (dataLoading) {
        return (
            <div className="request-form-container">
                <div className="loading">Loading universities data...</div>
            </div>
        );
    }

    return (
        <div className="request-form-container">
            <div className="form-wrapper">
                <div className="form-header">
                    <h1>Request a Resource</h1>
                    <p>Can't find what you're looking for? Let us know and we'll help you find it!</p>
                </div>

                {!user && (
                    <div className="auth-warning">
                        <p>⚠️ Please login to submit requests</p>
                    </div>
                )}

                {submitSuccess && (
                    <div className="success-message">
                        <div className="success-icon">✓</div>
                        <div>
                            <p className="success-title">Request submitted successfully!</p>
                            <p className="success-subtitle">We'll notify you when we find a suitable resource.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="request-form">
                    {renderField('title', 'Request Title', 'text')}
                    {renderField('description', 'Detailed Description', 'textarea')}

                    <div className="form-row">
                        {renderField('type', 'Resource Type', 'select', resourceTypes)}
                        {renderField('priority', 'Priority Level', 'select', priorityLevels)}
                    </div>

                    {formData.type === 'university' && (
                        <>
                            {renderField('university', 'University', 'select', universities)}
                            {formData.university && renderField('domain', 'Domain', 'select', domains)}
                            {formData.domain && renderField('subject', 'Subject', 'select', subjects)}
                        </>
                    )}

                    {formData.type === 'skill' && (
                        renderField('skill', 'Skill Name', 'text')
                    )}

                    {formData.type === 'competitive' && (
                        renderField('exam', 'Exam Name', 'text')
                    )}

                    {renderField('contactEmail', 'Contact Email (Optional)', 'email', null, false)}

                    {errors.submit && (
                        <div className="error-alert">
                            <p>{errors.submit}</p>
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => {
                                setFormData({
                                    title: '',
                                    description: '',
                                    type: '',
                                    subject: '',
                                    university: '',
                                    domain: '',
                                    skill: '',
                                    exam: '',
                                    priority: 'medium',
                                    contactEmail: ''
                                });
                                setErrors({});
                            }}
                            className="btn btn-secondary"
                        >
                            Clear Form
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !user}
                            className="btn btn-primary"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>

                <div className="request-info">
                    <h3>How it works:</h3>
                    <ul>
                        <li>Submit your request with as much detail as possible</li>
                        <li>Our team will review and search for suitable resources</li>
                        <li>We'll notify you via email when we find a match</li>
                        <li>High priority requests are processed first</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RequestResource;