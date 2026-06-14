import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useUniversitiesTree, useCatalog } from '../catalog/hooks/useCatalog';
import { useSubmitResource } from './hooks/useResources';
import './SubmitResource.css';

/**
 * Submit a resource (student). Posts to POST /api/resources with exactly one of
 * subjectId / skillId / examId. Catalog dropdowns come from the catalog API.
 */
const SubmitResource = () => {
  const { isAuthenticated } = useAuth();
  const submitResource = useSubmitResource();

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
    exam: '',
  });
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(''); // '', 'success', 'error'

  // Catalog data for the dropdowns. The universities tree nests only domains,
  // so subjects are fetched on demand by the selected domain.
  const { data: universities = [] } = useUniversitiesTree();
  const { data: subjects = [] } = useCatalog('subjects', formData.domain, {
    enabled: Boolean(formData.domain),
  });
  const { data: skillCategories = [] } = useCatalog('skill-categories');
  const { data: skills = [] } = useCatalog('skills', formData.skillCategory, {
    enabled: Boolean(formData.skillCategory),
  });
  const { data: examCategories = [] } = useCatalog('exam-categories');
  const { data: exams = [] } = useCatalog('exams', formData.examCategory, {
    enabled: Boolean(formData.examCategory),
  });

  // Domains come from the selected university in the tree.
  const selectedUni = universities.find((u) => u.id === formData.university);
  const domains = selectedUni?.domains || [];

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Resource title is required';
    if (!formData.url.trim()) newErrors.url = 'URL is required';
    else if (!isValidUrl(formData.url)) newErrors.url = 'Please enter a valid URL';

    if (formData.university && !formData.subject) newErrors.subject = 'Please select a subject';
    if (formData.skillCategory && !formData.skill) newErrors.skill = 'Please select a skill';
    if (formData.examCategory && !formData.exam) newErrors.exam = 'Please select an exam';

    // Exactly one parent must be chosen.
    const parents = [formData.subject, formData.skill, formData.exam].filter(Boolean);
    if (parents.length === 0) {
      newErrors.category = 'Please select a university subject, a skill, or an exam';
    } else if (parents.length > 1) {
      newErrors.category = 'Pick only one of: subject, skill, or exam';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Reset dependent fields.
      if (name === 'university') { next.domain = ''; next.subject = ''; }
      else if (name === 'domain') next.subject = '';
      else if (name === 'skillCategory') next.skill = '';
      else if (name === 'examCategory') next.exam = '';
      return next;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', url: '',
      university: '', domain: '', subject: '',
      skillCategory: '', skill: '', examCategory: '', exam: '',
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setErrors({ submit: 'Please login to submit resources' });
      return;
    }
    if (!validateForm()) return;

    // Build the API body with exactly one parent id.
    const body = {
      title: formData.title,
      url: formData.url,
      ...(formData.description && { description: formData.description }),
    };
    if (formData.subject) body.subjectId = formData.subject;
    else if (formData.skill) body.skillId = formData.skill;
    else if (formData.exam) body.examId = formData.exam;

    try {
      await submitResource.mutateAsync(body);
      setSubmitStatus('success');
      resetForm();
      setTimeout(() => setSubmitStatus(''), 4000);
    } catch (err) {
      setSubmitStatus('error');
      setErrors((prev) => ({
        ...prev,
        submit: err?.response?.data?.error?.message || 'Failed to submit resource. Please try again.',
      }));
      setTimeout(() => setSubmitStatus(''), 4000);
    }
  };

  const isSubmitting = submitResource.isPending;

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
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
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

      {errors[name] && <p className="error-message">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="resource-form-container">
      <div className="form-wrapper">
        <div className="form-header">
          <h1>Submit a Resource</h1>
          <p>Share valuable learning resources with the community</p>
        </div>

        {!isAuthenticated && (
          <div className="auth-warning">
            <p>⚠️ Please login to submit resources</p>
          </div>
        )}

        {submitStatus === 'success' && (
          <div className="success-alert">
            <p>✓ Resource submitted successfully and is pending approval.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="resource-form">
          {renderField('title', 'Resource Title', 'text')}
          {renderField('description', 'Description', 'textarea', null, false)}
          {renderField('url', 'Resource URL', 'url')}

          <div className="form-section">
            <h3>Categorize Your Resource</h3>
            <p>Select exactly one category for your resource:</p>

            <div className="category-section">
              <h4>📚 University Subject</h4>
              {renderField('university', 'University', 'select', universities, false)}
              {formData.university && renderField('domain', 'Domain', 'select', domains, false)}
              {formData.domain && renderField('subject', 'Subject', 'select', subjects, false)}
            </div>

            <div className="category-section">
              <h4>💡 Skill Development</h4>
              {renderField('skillCategory', 'Skill Category', 'select', skillCategories, false)}
              {formData.skillCategory && renderField('skill', 'Skill', 'select', skills, false)}
            </div>

            <div className="category-section">
              <h4>📝 Competitive Exam</h4>
              {renderField('examCategory', 'Exam Category', 'select', examCategories, false)}
              {formData.examCategory && renderField('exam', 'Exam', 'select', exams, false)}
            </div>
          </div>

          {errors.category && (
            <div className="error-alert"><p>{errors.category}</p></div>
          )}
          {errors.submit && (
            <div className="error-alert"><p>{errors.submit}</p></div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isAuthenticated}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitResource;
