import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { createRequest } from './requestsApi';
import './RequestResource.css';

/**
 * Request a resource (student). Maps to POST /api/requests with a simple body:
 * { title, description?, context? }. The previous Supabase form had type/
 * university/subject/priority fields that the API doesn't model; that detail now
 * goes into the free-text "context" field for management to triage.
 */
const RequestResource = () => {
  const { isAuthenticated } = useAuth();
  const requestMutation = useMutation({ mutationFn: createRequest });

  const [formData, setFormData] = useState({ title: '', description: '', context: '' });
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Request title is required';
    }
    if (formData.description && formData.description.length > 5000) {
      newErrors.description = 'Description is too long';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', context: '' });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setErrors({ submit: 'Please login to submit requests' });
      return;
    }
    if (!validateForm()) return;

    const body = {
      title: formData.title,
      ...(formData.description && { description: formData.description }),
      ...(formData.context && { context: formData.context }),
    };

    try {
      await requestMutation.mutateAsync(body);
      setSubmitSuccess(true);
      resetForm();
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: err?.response?.data?.error?.message || 'Failed to submit request. Please try again.',
      }));
    }
  };

  const isSubmitting = requestMutation.isPending;

  const renderField = (name, label, type = 'text', required = true) => (
    <div className="form-field">
      <label htmlFor={name} className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>
      {type === 'textarea' ? (
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
    <div className="request-form-container">
      <div className="form-wrapper">
        <div className="form-header">
          <h1>Request a Resource</h1>
          <p>Can't find what you're looking for? Let us know and we'll help you find it!</p>
        </div>

        {!isAuthenticated && (
          <div className="auth-warning">
            <p>⚠️ Please login to submit requests</p>
          </div>
        )}

        {submitSuccess && (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <div>
              <p className="success-title">Request submitted successfully!</p>
              <p className="success-subtitle">We'll review it and follow up when we find a match.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="request-form">
          {renderField('title', 'Request Title', 'text')}
          {renderField('description', 'Detailed Description', 'textarea', false)}
          {renderField(
            'context',
            'Context (university / subject / skill / exam, links, etc.)',
            'textarea',
            false,
          )}

          {errors.submit && (
            <div className="error-alert">
              <p>{errors.submit}</p>
            </div>
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
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        <div className="request-info">
          <h3>How it works:</h3>
          <ul>
            <li>Submit your request with as much detail as possible</li>
            <li>Our team will review and search for suitable resources</li>
            <li>We'll follow up when we find a match</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RequestResource;
