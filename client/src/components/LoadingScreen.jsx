import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const LoadingScreen = ({ error }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [forceSkip, setForceSkip] = useState(false);
    const { loadingProgress, refreshData } = useData();

    // Auto-skip loading screen after 10 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            console.log('[LoadingScreen] Auto-skipping after 10 seconds');
            setForceSkip(true);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    if (forceSkip) {
        return null; // Allow app to render even if loading isn't complete
    }

    const handleSkipLoading = () => {
        console.log('[LoadingScreen] User skipped loading');
        setForceSkip(true);
    };

    const handleRetry = () => {
        console.log('[LoadingScreen] User requested retry');
        refreshData();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            zIndex: 9999,
            textAlign: 'center',
            padding: '20px'
        }}>
            {/* Loading Animation */}
            <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                borderTopColor: 'white',
                animation: 'spin 1s linear infinite',
                marginBottom: '30px'
            }} />

            {/* Main Content */}
            <h2 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>
                Loading Resources
            </h2>

            <p style={{ margin: '0 0 20px 0', opacity: 0.8, fontSize: '16px' }}>
                {error ? 'Having trouble loading data...' : 'Fetching educational resources for you'}
            </p>

            {/* Progress Bar */}
            <div style={{
                width: '300px',
                height: '6px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '3px',
                marginBottom: '10px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${loadingProgress}%`,
                    height: '100%',
                    background: 'white',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                }} />
            </div>

            <p style={{
                margin: '0 0 30px 0',
                fontSize: '14px',
                opacity: 0.7
            }}>
                {loadingProgress}% complete
            </p>

            {/* Error State */}
            {error && (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    maxWidth: '500px'
                }}>
                    <p style={{ margin: '0 0 10px 0', color: '#ffeb3b' }}>
                        ⚠️ Connection Issue
                    </p>
                    <p style={{ margin: '0', fontSize: '14px', opacity: 0.9 }}>
                        {error}
                    </p>
                    {showDetails && (
                        <div style={{
                            marginTop: '10px',
                            fontSize: '12px',
                            opacity: 0.7,
                            fontFamily: 'monospace'
                        }}>
                            <p>Possible issues:</p>
                            <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
                                <li>Supabase URL/Key not configured in .env</li>
                                <li>Database tables don't exist</li>
                                <li>Network connectivity issues</li>
                                <li>Database permissions</li>
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {error && (
                    <button
                        onClick={handleRetry}
                        style={{
                            padding: '12px 24px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        🔄 Retry
                    </button>
                )}

                <button
                    onClick={handleSkipLoading}
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}
                >
                    Continue with Demo Data
                </button>

                {error && (
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        style={{
                            padding: '12px 24px',
                            background: 'transparent',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        {showDetails ? 'Hide' : 'Show'} Details
                    </button>
                )}
            </div>

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;