import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../../shared/lib/permissions';
import {
    usePendingResources,
    useSetResourceApproval,
    useAdminUsers,
} from '../hooks/useAdmin';
import { useResources } from '../../resources/hooks/useResources';
import { useUniversitiesTree } from '../../catalog/hooks/useCatalog';
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
    const { user, hasPermission } = useAuth();
    const isAdmin = hasPermission(PERMISSIONS.CATALOG_MANAGE);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // --- Server state via React Query -----------------------------------------
    const { data: pendingResult, isLoading: pendingLoading } = usePendingResources();
    const pendingResources = pendingResult?.data ?? [];

    const { data: approvedResult } = useResources({ limit: 1 });
    const { data: users = [] } = useAdminUsers();
    const { data: universities = [] } = useUniversitiesTree();

    const setApproval = useSetResourceApproval();

    const stats = {
        totalResources: approvedResult?.meta?.total ?? 0,
        pendingResources: pendingResult?.meta?.total ?? pendingResources.length,
        totalUsers: users.length,
        totalUniversities: universities.length,
    };

    // Resource approval: approve = isApproved true, deny = isApproved false.
    const handleApprovalStatusChange = async (resourceId, newStatus) => {
        if (newStatus === 'pending') return;

        if (newStatus === 'denied') {
            if (!window.confirm('Reject this submission? It will stay unapproved.')) return;
        }

        try {
            await setApproval.mutateAsync({
                id: resourceId,
                isApproved: newStatus === 'approved',
            });
            setSuccess(newStatus === 'approved' ? 'Resource approved' : 'Resource rejected');
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'Failed to update resource');
        }
    };

    const handleReturnToSite = () => navigate('/');

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

    // Handle window resize for mobile/desktop detection
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) setMobileMenuOpen(false);
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

    if (!isAdmin) {
        return (
            <div className="access-denied">
                <div className="access-denied-card">
                    <div className="access-denied-icon">
                        <AlertCircle size={40} />
                    </div>
                    <h2>Access Denied</h2>
                    <p>You don't have permission to access the admin dashboard.</p>
                    <button onClick={() => navigate('/')} className="access-denied-btn">
                        Return to Site
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
                    />
                );
            case 'pending-resources':
                return (
                    <PendingResourcesTab
                        pendingResources={pendingResources}
                        handleApprovalStatusChange={handleApprovalStatusChange}
                        loading={pendingLoading}
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
                                    if (window.innerWidth <= 768) setMobileMenuOpen(false);
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

                    <div className="nav-divider"></div>

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
                                <p>Welcome back, {user?.fullName || user?.email}</p>
                            </div>
                        </div>
                    </div>
                </header>

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

                <main className="page-content">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default ModernAdminDashboard;
