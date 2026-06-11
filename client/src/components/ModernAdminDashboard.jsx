import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './ModernAdminDashboard.css';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Building,
    BookOpen,
    FileText,
    Clock,
    Menu,
    AlertCircle,
    Check,
    X,
    Home
} from 'lucide-react';

// Import tab components
import DashboardOverview from './DashboardOverview';
import PendingResourcesTab from './PendingResourcesTab';
import ResourcesTab from './ResourcesTab';
import SubjectsTab from './SubjectsTab';
import DomainsTab from './DomainsTab';
import UniversitiesTab from './UniversitiesTab';
import UsersTab from './UsersTab';

const ModernAdminDashboard = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);

    // Data states
    const [pendingResources, setPendingResources] = useState([]);
    const [stats, setStats] = useState({
        totalResources: 0,
        pendingResources: 0,
        totalUsers: 0,
        totalUniversities: 0
    });

    // Fetch current user profile for display name
    const fetchCurrentUserProfile = async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setCurrentUserProfile(data);
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
        }
    };

    // Fetch functions
    const fetchPendingResources = async () => {
        try {
            const { data: resources, error: resourcesError } = await supabase
                .from('resources')
                .select(`
                    *,
                    subjects (
                        name,
                        domains (
                            name,
                            universities (name)
                        )
                    )
                `)
                .eq('is_approved', false)
                .order('created_at', { ascending: false });

            if (resourcesError) throw resourcesError;

            const userIds = [...new Set(resources?.map(r => r.submitted_by).filter(Boolean))];
            let userProfiles = [];

            if (userIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('user_profiles')
                    .select('id, full_name')
                    .in('id', userIds);

                if (!profilesError) {
                    userProfiles = profiles || [];
                }
            }

            const profileMap = {};
            userProfiles.forEach(profile => {
                profileMap[profile.id] = profile;
            });

            const resourcesWithUsers = (resources || []).map(resource => ({
                ...resource,
                user_profiles: resource.submitted_by ? profileMap[resource.submitted_by] : null
            }));

            setPendingResources(resourcesWithUsers);
            return resourcesWithUsers.length;
        } catch (err) {
            console.error('Error fetching pending resources:', err);
            setError('Failed to fetch pending resources');
            return 0;
        }
    };

    const fetchStats = async () => {
        try {
            const [resourcesCount, usersCount, universitiesCount, pendingCount] = await Promise.all([
                supabase.from('resources').select('*', { count: 'exact', head: true }).eq('is_approved', true),
                supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
                supabase.from('universities').select('*', { count: 'exact', head: true }),
                fetchPendingResources()
            ]);

            setStats({
                totalResources: resourcesCount.count || 0,
                totalUsers: usersCount.count || 0,
                totalUniversities: universitiesCount.count || 0,
                pendingResources: pendingCount
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    // Resource approval
    const handleApprovalStatusChange = async (resourceId, newStatus) => {
        if (newStatus === 'pending') return;

        if (newStatus === 'approved') {
            try {
                const { error } = await supabase
                    .from('resources')
                    .update({ is_approved: true, updated_at: new Date().toISOString() })
                    .eq('id', resourceId);

                if (error) throw error;

                setSuccess('Resource approved successfully');
                fetchPendingResources();
                fetchStats();
            } catch (err) {
                console.error('Error approving resource:', err);
                setError('Failed to approve resource');
            }
        }

        if (newStatus === 'denied') {
            if (!window.confirm('Are you sure you want to deny and delete this resource?')) {
                return;
            }

            try {
                const { error } = await supabase
                    .from('resources')
                    .delete()
                    .eq('id', resourceId);

                if (error) throw error;

                setSuccess('Resource denied and removed');
                fetchPendingResources();
                fetchStats();
            } catch (err) {
                console.error('Error denying resource:', err);
                setError('Failed to deny resource');
            }
        }
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            await fetchStats();
        } catch (err) {
            setError('Failed to refresh data');
        } finally {
            setLoading(false);
        }
    };

    // Handle navigation to home
    const handleReturnToSite = () => {
        navigate('/');
    };

    // Load data based on active tab
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'dashboard') {
                    await fetchStats();
                } else if (activeTab === 'pending-resources') {
                    await fetchPendingResources();
                }
            } catch (err) {
                setError('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        if (isAdmin()) {
            loadData();
        }
    }, [activeTab, isAdmin]);

    // Clear notifications
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    // Initialize dashboard
    useEffect(() => {
        if (isAdmin()) {
            fetchStats();
            fetchCurrentUserProfile();
        }
    }, [isAdmin, user]);

    // Handle window resize for mobile/desktop detection
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle clicking outside sidebar on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileMenuOpen && window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && !sidebar.contains(event.target)) {
                    setMobileMenuOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen]);

    if (!isAdmin()) {
        return (
            <div className="access-denied">
                <div className="access-denied-card">
                    <div className="access-denied-icon">
                        <AlertCircle size={40} />
                    </div>
                    <h2>Access Denied</h2>
                    <p>You don't have permission to access the admin dashboard.</p>
                    <button
                        onClick={() => window.close()}
                        className="access-denied-btn"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        );
    }

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'pending-resources', label: 'Pending Review', icon: Clock, badge: stats.pendingResources || null },
        { id: 'resources', label: 'Resources', icon: FileText, badge: null },
        { id: 'subjects', label: 'Subjects', icon: BookOpen, badge: null },
        { id: 'domains', label: 'Domains', icon: GraduationCap, badge: null },
        { id: 'universities', label: 'Universities', icon: Building, badge: null },
        { id: 'users', label: 'Users', icon: Users, badge: null }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <DashboardOverview
                        stats={stats}
                        pendingResources={pendingResources}
                        handleApprovalStatusChange={handleApprovalStatusChange}
                        setActiveTab={setActiveTab}
                        onRefresh={refreshData}
                    />
                );
            case 'pending-resources':
                return (
                    <PendingResourcesTab
                        pendingResources={pendingResources}
                        handleApprovalStatusChange={handleApprovalStatusChange}
                        loading={loading}
                    />
                );
            case 'resources':
                return <ResourcesTab />;
            case 'subjects':
                return <SubjectsTab />;
            case 'domains':
                return <DomainsTab />;
            case 'universities':
                return <UniversitiesTab />;
            case 'users':
                return <UsersTab />;
            default:
                return (
                    <div className="coming-soon">
                        <div className="coming-soon-content">
                            <h3>{menuItems.find(item => item.id === activeTab)?.label || 'Page'}</h3>
                            <p>Content for this section coming soon...</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="admin-dashboard">
            {/* Sidebar */}
            <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="sidebar-toggle"
                        >
                            <Menu size={20} />
                        </button>
                        {!sidebarCollapsed && (
                            <h1 className="sidebar-title">CachedInfo</h1>
                        )}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    // Close mobile menu when navigating
                                    if (window.innerWidth <= 768) {
                                        setMobileMenuOpen(false);
                                    }
                                }}
                                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            >
                                <Icon size={20} className="nav-icon" />
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="nav-label">{item.label}</span>
                                        {item.badge && (
                                            <span className="nav-badge">{item.badge}</span>
                                        )}
                                    </>
                                )}
                            </button>
                        );
                    })}

                    {/* Divider */}
                    <div className="nav-divider"></div>

                    {/* Return to Site Item */}
                    <button
                        onClick={handleReturnToSite}
                        className="nav-item nav-item-return"
                    >
                        <Home size={20} className="nav-icon" />
                        {!sidebarCollapsed && (
                            <span className="nav-label">Return to Site</span>
                        )}
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Top Header */}
                <header className="top-header">
                    <div className="header-content">
                        <div className="header-left">
                            <button
                                onClick={() => {
                                    if (window.innerWidth <= 768) {
                                        setMobileMenuOpen(!mobileMenuOpen);
                                    } else {
                                        setSidebarCollapsed(!sidebarCollapsed);
                                    }
                                }}
                                className="mobile-menu-toggle"
                            >
                                <Menu size={20} />
                            </button>
                            <div>
                                <h2>{menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}</h2>
                                <p>Welcome back, {currentUserProfile?.full_name || user?.email}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Notifications */}
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

                {/* Page Content */}
                <main className="page-content">
                    {loading && activeTab === 'dashboard' ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <span className="loading-text">Loading...</span>
                        </div>
                    ) : (
                        renderContent()
                    )}
                </main>
            </div>
        </div>
    );
};

export default ModernAdminDashboard;