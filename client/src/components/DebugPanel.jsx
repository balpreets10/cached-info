import React from 'react';
import { useData } from '../context/DataContext';

const DebugPanel = ({ show = false }) => {
    const {
        universities,
        allResources,
        loading,
        error,
        initialLoadComplete,
        loadingProgress
    } = useData();

    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: '#000',
            color: '#fff',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px',
            fontFamily: 'monospace'
        }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>Debug Info</h4>
            <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
            <div><strong>Initial Load Complete:</strong> {initialLoadComplete ? 'Yes' : 'No'}</div>
            <div><strong>Loading Progress:</strong> {loadingProgress}%</div>
            <div><strong>Error:</strong> {error || 'None'}</div>
            <div><strong>Universities:</strong> {universities?.length || 0}</div>
            <div><strong>Resources:</strong> {allResources?.length || 0}</div>

            {allResources?.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                    <strong>Sample Resources:</strong>
                    {allResources.slice(0, 3).map((resource, index) => (
                        <div key={index} style={{
                            marginLeft: '10px',
                            fontSize: '10px',
                            color: '#ccc',
                            borderLeft: '2px solid #333',
                            paddingLeft: '5px',
                            marginTop: '5px'
                        }}>
                            <div><strong>Title:</strong> {resource.title}</div>
                            <div><strong>Type:</strong> {resource.type}</div>
                            <div><strong>ID:</strong> {resource._id}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: '10px', fontSize: '10px', color: '#888' }}>
                Press F12 and check Console for detailed logs
            </div>
        </div>
    );
};

export default DebugPanel;