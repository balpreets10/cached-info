import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS } from '../lib/permissions';
import './Header.css';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const location = useLocation();
    const { user, roles, signOut, loading, hasPermission } = useAuth();
    // Express user shape: { id, email, fullName, avatarUrl }. The old code also
    // referenced a separate userProfile (Supabase) — they're unified now.
    const isAdmin = () => hasPermission(PERMISSIONS.CATALOG_MANAGE);
    const navigate = useNavigate();

    // Close menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
        setShowUserMenu(false);
    }, [location.pathname]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768 && isMenuOpen) {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMenuOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (isMenuOpen) {
                    setIsMenuOpen(false);
                }
                if (showUserMenu) {
                    setShowUserMenu(false);
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMenuOpen, showUserMenu]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showUserMenu && !event.target.closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUserMenu]);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const toggleUserMenu = () => {
        setShowUserMenu(!showUserMenu);
    };

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            setShowUserMenu(false);
            setIsMenuOpen(false);

            await signOut();

            // Navigate to home page after successful logout
            // Use React Router's navigate instead of window.location
            window.location.href = '/';

        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        } finally {
            setIsLoggingOut(false);
        }
    };

    // Handle admin dashboard click - open in new tab
    // const handleDashboardClick = (e) => {
    //     e.preventDefault();
    //     setShowUserMenu(false);
    //     closeMenu();
    //     // Open admin dashboard in new tab
    //     window.open('/admin-dashboard', '_blank');
    // };

    const handleDashboardClick = (e) => {
        e.preventDefault();
        setShowUserMenu(false);
        closeMenu();

        // Option A: Navigate in same tab
        navigate('/admin-dashboard');

        // Option B: Use window.open with hash routing fallback
        // const newWindow = window.open('/#/admin-dashboard', '_blank');
        // if (!newWindow) {
        //     navigate('/admin-dashboard');
        // }
    };

    const isActive = (path) => location.pathname === path;

    const getUserInitials = () => {
        if (!user) return '';

        if (user.fullName) {
            return user.fullName
                .split(' ')
                .map(name => name.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
        }

        if (user.email) {
            return user.email.charAt(0).toUpperCase();
        }

        return 'U';
    };

    const getUserDisplayName = () => {
        if (!user) return '';
        return user.fullName || user.email || 'User';
    };

    return (
        <header className="header">
            <div className="logo">Cached<strong>Info</strong></div>

            <button
                className={`hamburger-menu ${isMenuOpen ? 'hamburger-active' : ''}`}
                onClick={toggleMenu}
                aria-label="Toggle navigation menu"
                aria-expanded={isMenuOpen}
            >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
            </button>

            <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
                <Link
                    to="/"
                    className={`nav-link ${isActive('/') ? 'active' : ''}`}
                    onClick={closeMenu}
                >
                    Home
                </Link>
                <Link
                    to="/resources"
                    className={`nav-link ${isActive('/resources') ? 'active' : ''}`}
                    onClick={closeMenu}
                >
                    Resources
                </Link>
                <Link
                    to="/request"
                    className={`nav-link ${isActive('/request') ? 'active' : ''}`}
                    onClick={closeMenu}
                >
                    Request Resource
                </Link>
                <Link
                    to="/submit"
                    className={`nav-link ${isActive('/submit') ? 'active' : ''}`}
                    onClick={closeMenu}
                >
                    Submit Resource
                </Link>
                <Link
                    to="/our-story"
                    className={`nav-link ${isActive('/our-story') ? 'active' : ''}`}
                    onClick={closeMenu}
                >
                    Our Story
                </Link>

                {/* Authentication Section */}
                {!loading && (
                    <>
                        {user ? (
                            // User is logged in - show user menu
                            <div className="user-menu-container">
                                <button
                                    className="user-avatar-btn"
                                    onClick={toggleUserMenu}
                                    aria-label="User menu"
                                    aria-expanded={showUserMenu}
                                >
                                    <div className="user-avatar">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt="User avatar"
                                                className="avatar-image"
                                            />
                                        ) : (
                                            <span className="avatar-initials">
                                                {getUserInitials()}
                                            </span>
                                        )}
                                    </div>
                                    <svg className="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {showUserMenu && (
                                    <div className="user-dropdown">
                                        <div className="user-info">
                                            <div className="user-name">{getUserDisplayName()}</div>
                                            <div className="user-email">{user.email}</div>
                                            {roles?.length > 0 && (
                                                <div className="user-role">Role: {roles.join(', ')}</div>
                                            )}
                                        </div>
                                        <hr className="dropdown-divider" />

                                        {/* Only show Dashboard for admin users */}
                                        {isAdmin() && (
                                            <>
                                                <button
                                                    onClick={handleDashboardClick}
                                                    className="dropdown-link dashboard-btn"
                                                >
                                                    <span className="dropdown-icon">📊</span>
                                                    Admin Dashboard
                                                    <span className="new-tab-indicator">↗</span>
                                                </button>
                                                <hr className="dropdown-divider" />
                                            </>
                                        )}

                                        <button
                                            onClick={handleLogout}
                                            disabled={isLoggingOut}
                                            className="dropdown-link logout-btn"
                                        >
                                            <span className="dropdown-icon">🚪</span>
                                            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // User is not logged in - show sign in link
                            <Link
                                to="/signin"
                                className={`nav-link auth-link ${isActive('/signin') ? 'active' : ''}`}
                                onClick={closeMenu}
                            >
                                Sign In
                            </Link>
                        )}
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;