import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import './SubmitResource.css';

const SubmitResource = () => {
    const { universities, loading: dataLoading } = useData();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        url: '',
        university: '',
        domain: '',
        subject: '',
        skillCategory: '',
        skill: '',
        examCategory: '',
        exam: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitProgress, setSubmitProgress] = useState(0);
    const [submitStatus, setSubmitStatus] = useState(''); // 'uploading', 'processing', 'success', 'error'
    const [domains, setDomains] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [skillCategories, setSkillCategories] = useState([]);
    const [skills, setSkills] = useState([]);
    const [examCategories, setExamCategories] = useState([]);
    const [exams, setExams] = useState([]);

    // Fetch skill categories and skills from database
    const fetchSkillData = async () => {
        try {
            // Fetch skill categories
            const { data: skillCategoriesData, error: skillCatError } = await supabase
                .from('skill_categories')
                .select('*')
                .order('name');

            if (skillCatError) throw skillCatError;

            // Fetch all skills with their categories
            const { data: skillsData, error: skillsError } = await supabase
                .from('skills')
                .select('*, skill_categories(name)')
                .order('name');

            if (skillsError) throw skillsError;

            setSkillCategories(skillCategoriesData || []);

            // Group skills by category
            const skillsByCategory = {};
            skillsData?.forEach(skill => {
                const categoryId = skill.skill_category_id;
                if (!skillsByCategory[categoryId]) {
                    skillsByCategory[categoryId] = [];
                }
                skillsByCategory[categoryId].push(skill);
            });

            return skillsByCategory;
        } catch (error) {
            console.error('Error fetching skill data:', error);
            return {};
        }
    };

    // Fetch exam categories and exams from database
    const fetchExamData = async () => {
        try {
            // Fetch exam categories
            const { data: examCategoriesData, error: examCatError } = await supabase
                .from('exam_categories')
                .select('*')
                .order('name');

            if (examCatError) throw examCatError;

            // Fetch all exams with their categories
            const { data: examsData, error: examsError } = await supabase
                .from('exams')
                .select('*, exam_categories(name)')
                .order('name');

            if (examsError) throw examsError;

            setExamCategories(examCategoriesData || []);

            // Group exams by category
            const examsByCategory = {};
            examsData?.forEach(exam => {
                const categoryId = exam.exam_category_id;
                if (!examsByCategory[categoryId]) {
                    examsByCategory[categoryId] = [];
                }
                examsByCategory[categoryId].push(exam);
            });

            return examsByCategory;
        } catch (error) {
            console.error('Error fetching exam data:', error);
            return {};
        }
    };

    // Load initial data on component mount
    useEffect(() => {
        const loadInitialData = async () => {
            const [skillsByCategory, examsByCategory] = await Promise.all([
                fetchSkillData(),
                fetchExamData()
            ]);

            setSkills(skillsByCategory);
            setExams(examsByCategory);
        };

        loadInitialData();
    }, []);

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
            newErrors.title = 'Resource title is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        } else if (formData.description.length < 10) {
            newErrors.description = 'Description must be at least 10 characters long';
        }

        if (!formData.url.trim()) {
            newErrors.url = 'URL is required';
        } else if (!isValidUrl(formData.url)) {
            newErrors.url = 'Please enter a valid URL';
        }

        // Validate university resource requirements
        if (formData.university && !formData.domain) {
            newErrors.domain = 'Please select a domain';
        }
        if (formData.domain && !formData.subject) {
            newErrors.subject = 'Please select a subject';
        }

        // Validate skill requirements
        if (formData.skillCategory && !formData.skill) {
            newErrors.skill = 'Please select a skill';
        }

        // Validate exam requirements
        if (formData.examCategory && !formData.exam) {
            newErrors.exam = 'Please select an exam';
        }

        // At least one category must be selected
        if (!formData.university && !formData.skillCategory && !formData.examCategory) {
            newErrors.category = 'Please select either a university subject, skill, or exam category';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isValidUrl = (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    // Function to submit resource to Supabase
    const submitToSupabase = async (resourceData) => {
        try {
            const { data, error } = await supabase
                .from('resources')
                .insert([{
                    subject_id: resourceData.subject_id || null,
                    skill_id: resourceData.skill_id || null,
                    exam_id: resourceData.exam_id || null,
                    title: resourceData.title,
                    description: resourceData.description,
                    url: resourceData.url,
                    submitted_by: user?.id,
                    is_approved: false // Default to false for approval workflow
                }])
                .select()
                .single();

            if (error) throw error;

            // Also track in user_submitted_resources
            if (data?.id) {
                const { error: trackingError } = await supabase
                    .from('user_submitted_resources')
                    .insert({
                        user_id: user.id,
                        resource_id: data.id
                    });

                if (trackingError) {
                    console.warn('Failed to track user submission:', trackingError);
                    // Don't fail the entire operation for tracking
                }
            }

            return { success: true, id: data.id };
        } catch (error) {
            console.error('Failed to save resource to Supabase:', error);
            throw error;
        }
    };

    // Animated progress simulation
    const simulateProgress = (callback) => {
        setSubmitProgress(0);
        const interval = setInterval(() => {
            setSubmitProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    callback();
                    return 100;
                }
                return prev + Math.random() * 15 + 5;
            });
        }, 200);
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

        // Reset dependent fields
        if (name === 'university') {
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
        } else if (name === 'skillCategory') {
            setFormData(prev => ({
                ...prev,
                skill: ''
            }));
        } else if (name === 'examCategory') {
            setFormData(prev => ({
                ...prev,
                exam: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            setErrors({ submit: 'Please login to submit resources' });
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('uploading');
        setSubmitProgress(0);

        try {
            // Prepare data for submission
            const resourceData = {
                title: formData.title,
                description: formData.description,
                url: formData.url
            };

            // Set the appropriate ID based on selected category
            if (formData.subject) {
                resourceData.subject_id = formData.subject;
            } else if (formData.skill) {
                resourceData.skill_id = formData.skill;
            } else if (formData.exam) {
                resourceData.exam_id = formData.exam;
            } else {
                throw new Error('Please select a category for your resource');
            }

            // Simulate upload progress
            simulateProgress(async () => {
                setSubmitStatus('processing');

                try {
                    // Submit to Supabase
                    await submitToSupabase(resourceData);

                    // Final processing delay
                    setTimeout(() => {
                        setSubmitStatus('success');

                        // Clear form
                        setFormData({
                            title: '',
                            description: '',
                            url: '',
                            university: '',
                            domain: '',
                            subject: '',
                            skillCategory: '',
                            skill: '',
                            examCategory: '',
                            exam: ''
                        });

                        // Reset state after 4 seconds
                        setTimeout(() => {
                            setSubmitStatus('');
                            setSubmitProgress(0);
                            setIsSubmitting(false);
                        }, 4000);
                    }, 1000);

                } catch (error) {
                    console.error('Error saving resource:', error);
                    setSubmitStatus('error');
                    setErrors(prev => ({
                        ...prev,
                        submit: 'Failed to save resource. Please try again.'
                    }));

                    setTimeout(() => {
                        setSubmitStatus('');
                        setSubmitProgress(0);
                        setIsSubmitting(false);
                    }, 3000);
                }
            });

        } catch (error) {
            console.error('Error submitting resource:', error);
            setSubmitStatus('error');
            setErrors(prev => ({
                ...prev,
                submit: 'Failed to submit resource. Please try again.'
            }));

            setTimeout(() => {
                setSubmitStatus('');
                setSubmitProgress(0);
                setIsSubmitting(false);
            }, 3000);
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
                    disabled={isSubmitting}
                >
                    <option value="">Select {label}</option>
                    {options.map(option => (
                        <option key={option.value || option.id || option._id} value={option.value || option.id || option._id}>
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                />
            )}

            {errors[name] && (
                <p className="error-message">{errors[name]}</p>
            )}
        </div>
    );

    const renderProgressModal = () => {
        if (!isSubmitting && submitStatus !== 'success') return null;

        return (
            <div className="progress-modal-overlay">
                <div className="progress-modal">
                    {submitStatus === 'uploading' && (
                        <div className="progress-content">
                            <div className="progress-icon uploading">
                                <div className="upload-animation"></div>
                            </div>
                            <h3>Uploading Resource</h3>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${Math.min(submitProgress, 100)}%` }}
                                ></div>
                            </div>
                            <p>{Math.round(Math.min(submitProgress, 100))}% Complete</p>
                        </div>
                    )}

                    {submitStatus === 'processing' && (
                        <div className="progress-content">
                            <div className="progress-icon processing">
                                <div className="processing-animation"></div>
                            </div>
                            <h3>Processing Resource</h3>
                            <p>Saving to database...</p>
                        </div>
                    )}

                    {submitStatus === 'success' && (
                        <div className="progress-content">
                            <div className="progress-icon success">
                                <div className="checkmark">✓</div>
                            </div>
                            <h3>Success!</h3>
                            <p>Resource submitted successfully and is pending approval.</p>
                        </div>
                    )}

                    {submitStatus === 'error' && (
                        <div className="progress-content">
                            <div className="progress-icon error">
                                <div className="error-mark">✗</div>
                            </div>
                            <h3>Error</h3>
                            <p>Failed to submit resource. Please try again.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (dataLoading) {
        return (
            <div className="resource-form-container">
                <div className="loading">Loading data...</div>
            </div>
        );
    }

    return (
        <div className="resource-form-container">
            <div className="form-wrapper">
                <div className="form-header">
                    <h1>Submit a Resource</h1>
                    <p>Share valuable learning resources with the community</p>
                </div>

                {!user && (
                    <div className="auth-warning">
                        <p>⚠️ Please login to submit resources</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="resource-form">
                    {renderField('title', 'Resource Title', 'text')}
                    {renderField('description', 'Description', 'textarea')}
                    {renderField('url', 'Resource URL', 'url')}

                    <div className="form-section">
                        <h3>Categorize Your Resource</h3>
                        <p>Select the appropriate category for your resource:</p>

                        <div className="category-section">
                            <h4>📚 University Subject</h4>
                            {renderField('university', 'University', 'select', universities, false)}
                            {formData.university && renderField('domain', 'Domain', 'select', domains, false)}
                            {formData.domain && renderField('subject', 'Subject', 'select', subjects, false)}
                        </div>

                        <div className="category-section">
                            <h4>💡 Skill Development</h4>
                            {renderField('skillCategory', 'Skill Category', 'select', skillCategories, false)}
                            {formData.skillCategory && renderField('skill', 'Skill', 'select', skills[formData.skillCategory] || [], false)}
                        </div>

                        <div className="category-section">
                            <h4>📝 Competitive Exam</h4>
                            {renderField('examCategory', 'Exam Category', 'select', examCategories, false)}
                            {formData.examCategory && renderField('exam', 'Exam', 'select', exams[formData.examCategory] || [], false)}
                        </div>
                    </div>

                    {errors.category && (
                        <div className="error-alert">
                            <p>{errors.category}</p>
                        </div>
                    )}

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
                                    url: '',
                                    university: '',
                                    domain: '',
                                    subject: '',
                                    skillCategory: '',
                                    skill: '',
                                    examCategory: '',
                                    exam: ''
                                });
                                setErrors({});
                            }}
                            className="btn btn-secondary"
                            disabled={isSubmitting}
                        >
                            Clear Form
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !user}
                            className="btn btn-primary"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Resource'}
                        </button>
                    </div>
                </form>
            </div>

            {renderProgressModal()}
        </div>
    );
};

export default SubmitResource;