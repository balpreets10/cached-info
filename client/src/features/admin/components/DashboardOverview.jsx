import React from 'react';
import {
    FileText,
    Users,
    Building,
    Clock,
    Check,
    X,
    Download,
    RefreshCw,
    TrendingUp,
    Plus,
    Eye
} from 'lucide-react';

const DashboardOverview = ({
    stats,
    pendingResources,
    handleApprovalStatusChange,
    setActiveTab,
    onRefresh
}) => {
    const StatCard = ({ title, value, icon: Icon, gradient, description, trend }) => (
        <div className={`stat-card ${gradient}`}>
            <div className="stat-header">
                <div className="stat-info">
                    <p>{title}</p>
                    <h3 className="stat-value">{value.toLocaleString()}</h3>
                </div>
                <div className="stat-icon">
                    <Icon size={28} />
                </div>
            </div>
            <div className="stat-footer">
                {trend && <TrendingUp size={16} className="mr-2" />}
                <span>{description}</span>
            </div>
        </div>
    );

    return (
        <div className="dashboard-overview">
            {/* Welcome Header */}
            <div className="welcome-header">
                <div className="welcome-content">
                    <div className="welcome-text">
                        <h1>Welcome back, Admin! 👋</h1>
                        <p>Here's what's happening with your platform today.</p>
                    </div>
                    <div className="welcome-actions">
                        <button className="btn btn-secondary">
                            <Download size={16} />
                            Export
                        </button>
                        <button onClick={onRefresh} className="btn btn-primary">
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <StatCard
                    title="Total Resources"
                    value={stats.totalResources}
                    icon={FileText}
                    gradient="blue"
                    description="All approved resources"
                    trend={true}
                />
                <StatCard
                    title="Active Users"
                    value={stats.totalUsers}
                    icon={Users}
                    gradient="green"
                    description="Registered users"
                    trend={true}
                />
                <StatCard
                    title="Pending Review"
                    value={stats.pendingResources}
                    icon={Clock}
                    gradient="orange"
                    description="Awaiting approval"
                />
                <StatCard
                    title="Universities"
                    value={stats.totalUniversities}
                    icon={Building}
                    gradient="purple"
                    description="Educational institutions"
                />
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="two-column-grid">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Submissions</h3>
                        <button
                            className="card-action"
                            onClick={() => setActiveTab('pending-resources')}
                        >
                            View All
                        </button>
                    </div>
                    <div className="activity-list">
                        {pendingResources.slice(0, 3).map((resource) => (
                            <div key={resource.id} className="activity-item">
                                <div className="activity-content">
                                    <p className="activity-title">{resource.title}</p>
                                    <p className="activity-subtitle">
                                        by {resource.user_profiles?.full_name || 'Anonymous'}
                                    </p>
                                </div>
                                <div className="activity-actions">
                                    <button
                                        onClick={() => handleApprovalStatusChange(resource.id, 'approved')}
                                        className="activity-btn approve"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleApprovalStatusChange(resource.id, 'denied')}
                                        className="activity-btn deny"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {pendingResources.length === 0 && (
                            <div className="empty-state">
                                <Clock size={32} className="empty-icon" />
                                <p className="empty-text">No pending submissions</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Quick Actions</h3>
                    </div>
                    <div className="quick-actions">
                        <button
                            className="quick-action-btn blue"
                            onClick={() => setActiveTab('resources')}
                        >
                            <div className="quick-action-icon blue">
                                <Plus size={20} />
                            </div>
                            <div className="quick-action-content">
                                <p className="quick-action-label">Manage Resources</p>
                            </div>
                        </button>
                        <button
                            className="quick-action-btn green"
                            onClick={() => setActiveTab('universities')}
                        >
                            <div className="quick-action-icon green">
                                <Building size={20} />
                            </div>
                            <div className="quick-action-content">
                                <p className="quick-action-label">Manage Universities</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('pending-resources')}
                            className="quick-action-btn orange"
                        >
                            <div className="quick-action-icon orange">
                                <Clock size={20} />
                            </div>
                            <div className="quick-action-content">
                                <p className="quick-action-label">
                                    Review Pending
                                    {stats.pendingResources > 0 && (
                                        <span className="quick-action-badge">
                                            {stats.pendingResources}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;