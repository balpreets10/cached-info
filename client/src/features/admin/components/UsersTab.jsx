import React, { useState, useEffect } from 'react';
import { useAdminUsers, useSetUserRoles } from '../hooks/useAdmin';
import { ROLES } from '../../../shared/lib/permissions';
import {
    Search,
    Shield,
    User,
    Check,
    X,
    Crown
} from 'lucide-react';

/**
 * User + role management. Reads GET /api/admin/users and replaces a user's roles
 * via PUT /api/admin/users/:id/roles. Roles are 'student' / 'management'
 * (no separate auth.users delete — that endpoint doesn't exist server-side).
 */
const UsersTab = () => {
    const { data: users = [], isLoading, error: loadError } = useAdminUsers();
    const setUserRoles = useSetUserRoles();

    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            // Management inherits student capabilities server-side, so a single
            // role per user is sufficient here.
            await setUserRoles.mutateAsync({ userId, roles: [newRole] });
            setSuccess(`User role updated to ${newRole}`);
            setEditingUser(null);
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to update user role');
        }
    };

    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const isManagement = (user) => (user.roles || []).includes(ROLES.MANAGEMENT);
    const primaryRole = (user) => (isManagement(user) ? ROLES.MANAGEMENT : ROLES.STUDENT);

    const filteredUsers = users.filter((user) =>
        !searchTerm ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading users...</span>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="notification error">
                <X size={16} />
                Failed to load users.
            </div>
        );
    }

    return (
        <div className="users-tab">
            <div className="users-header">
                <div className="users-header-content">
                    <div className="users-header-text">
                        <h2>User Management</h2>
                        <p>Manage user roles ({users.length} total users)</p>
                    </div>
                    <div className="search-container">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>
            </div>

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

            <div className="users-table-container">
                <div className="users-table-wrapper">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-table-avatar">
                                                {(user.fullName || user.email || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-info">
                                                <p className="user-name">
                                                    {user.fullName || user.email?.split('@')[0] || 'No name'}
                                                </p>
                                                <p className="user-id">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {editingUser === user.id ? (
                                            <div className="role-edit-controls">
                                                <select
                                                    value={primaryRole(user)}
                                                    onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                                    className="role-select"
                                                >
                                                    <option value={ROLES.STUDENT}>Student</option>
                                                    <option value={ROLES.MANAGEMENT}>Management</option>
                                                </select>
                                                <button
                                                    onClick={() => setEditingUser(null)}
                                                    className="btn-cancel-edit"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="role-display">
                                                <span className={`role-badge ${primaryRole(user)}`}>
                                                    {isManagement(user) ? (
                                                        <>
                                                            <Crown size={12} />
                                                            Management
                                                        </>
                                                    ) : (
                                                        <>
                                                            <User size={12} />
                                                            Student
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className="user-date">
                                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="user-actions">
                                            <button
                                                onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                                                className="user-action-btn edit"
                                                title="Edit role"
                                            >
                                                <Shield size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredUsers.length === 0 && (
                <div className="empty-resource-state">
                    <div className="empty-resource-icon">
                        <User size={64} />
                    </div>
                    <h3 className="empty-resource-title">No users found</h3>
                    <p className="empty-resource-subtitle">
                        {searchTerm ? 'Try adjusting your search terms' : 'No users in the system'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default UsersTab;
