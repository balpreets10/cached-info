import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Shield,
    User,
    Check,
    X,
    Crown
} from 'lucide-react';

const UsersTab = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            // First try to get users from user_profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) {
                console.error('Error fetching user profiles:', profilesError);

                // If there's an RLS issue, try to get users from auth.users (requires proper permissions)
                // This might not work if RLS is blocking it, but it's worth trying
                const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

                if (authError) {
                    throw new Error('Unable to fetch users. This might be due to database permissions. Please ensure the admin user has proper access rights.');
                }

                // If we got auth users but no profiles, create basic profile data
                const usersWithProfiles = authData.users.map(user => ({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
                    role: user.user_metadata?.role || 'user',
                    created_at: user.created_at,
                    updated_at: user.updated_at || user.created_at,
                    email: user.email
                }));

                setUsers(usersWithProfiles);
            } else {
                // Successfully got user profiles
                setUsers(profilesData || []);
            }
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch users';
            setError(errorMessage);
            console.error('Error in fetchUsers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    role: newRole,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                // If update fails, try to insert the profile if it doesn't exist
                if (error.code === 'PGRST116') { // No rows updated
                    const userToUpdate = users.find(u => u.id === userId);
                    const { error: insertError } = await supabase
                        .from('user_profiles')
                        .insert({
                            id: userId,
                            full_name: userToUpdate?.full_name || userToUpdate?.email?.split('@')[0] || 'Unknown User',
                            role: newRole,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });

                    if (insertError) throw insertError;
                } else {
                    throw error;
                }
            }

            setSuccess(`User role updated to ${newRole}`);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            setError('Failed to update user role');
            console.error('Error updating role:', err);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            // First delete the user profile
            const { error: profileError } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', userId);

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError;
            }

            // Note: Deleting from auth.users requires admin privileges
            // This might not work depending on your setup
            try {
                const { error: authError } = await supabase.auth.admin.deleteUser(userId);
                if (authError) {
                    console.warn('Could not delete user from auth system:', authError);
                    setSuccess('User profile deleted (auth user may still exist)');
                } else {
                    setSuccess('User deleted successfully');
                }
            } catch (authErr) {
                console.warn('Auth deletion not available:', authErr);
                setSuccess('User profile deleted (auth user may still exist)');
            }

            fetchUsers();
        } catch (err) {
            setError('Failed to delete user');
            console.error('Error deleting user:', err);
        }
    };

    // Clear notifications after 5 seconds
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const filteredUsers = users.filter(user =>
        !searchTerm ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading users...</span>
            </div>
        );
    }

    return (
        <div className="users-tab">
            {/* Header */}
            <div className="users-header">
                <div className="users-header-content">
                    <div className="users-header-text">
                        <h2>User Management</h2>
                        <p>Manage user accounts and permissions ({users.length} total users)</p>
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

            {/* Users Table */}
            <div className="users-table-container">
                <div className="users-table-wrapper">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Join Date</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-table-avatar">
                                                {(user.full_name || user.email || user.id || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-info">
                                                <p className="user-name">
                                                    {user.full_name || user.email?.split('@')[0] || 'No name provided'}
                                                </p>
                                                <p className="user-id">{user.email || user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {editingUser === user.id ? (
                                            <div className="role-edit-controls">
                                                <select
                                                    value={user.role || 'user'}
                                                    onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                                    className="role-select"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
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
                                                <span className={`role-badge ${user.role || 'user'}`}>
                                                    {user.role === 'admin' ? (
                                                        <>
                                                            <Crown size={12} />
                                                            Admin
                                                        </>
                                                    ) : (
                                                        <>
                                                            <User size={12} />
                                                            User
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className="user-date">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="user-date">
                                            {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}
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
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="user-action-btn delete"
                                                title="Delete user"
                                            >
                                                <Trash2 size={16} />
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