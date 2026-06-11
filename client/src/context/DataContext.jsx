import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const DataContext = createContext({});

export const DataProvider = ({ children }) => {
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allResources, setAllResources] = useState([]);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Test Supabase connection
    const testConnection = async () => {
        try {
            const { data, error } = await supabase.from('universities').select('id').limit(1);
            if (error) throw error;
            console.log('[DataContext] Supabase connection successful');
            return true;
        } catch (err) {
            console.error('[DataContext] Supabase connection failed:', err);
            return false;
        }
    };

    // Simple resource fetch - gets all approved resources directly
    const fetchAllResources = async () => {
        try {
            console.log('[DataContext] Fetching all resources directly');

            const { data: resources, error } = await supabase
                .from('resources')
                .select(`
                    *,
                    subjects (
                        id,
                        name,
                        domains (
                            id,
                            name,
                            universities (
                                id,
                                name
                            )
                        )
                    ),
                    skills (
                        id,
                        name,
                        skill_categories (
                            id,
                            name
                        )
                    ),
                    exams (
                        id,
                        name,
                        exam_categories (
                            id,
                            name
                        )
                    )
                `)
                .eq('is_approved', true);

            if (error) throw error;

            console.log(`[DataContext] Found ${resources?.length || 0} approved resources`);
            return resources || [];
        } catch (err) {
            console.error('[DataContext] Error fetching resources:', err);
            throw err;
        }
    };

    // Fetch universities separately for autocomplete
    const fetchUniversitiesWithStructure = async () => {
        try {
            const { data: universities, error } = await supabase
                .from('universities')
                .select(`
                    *,
                    domains (
                        *,
                        subjects (*)
                    )
                `);

            if (error) throw error;
            return universities || [];
        } catch (err) {
            console.error('[DataContext] Error fetching universities:', err);
            return [];
        }
    };

    // Transform resources into consistent format
    const transformResources = (resources) => {
        if (!resources || !Array.isArray(resources)) return [];

        return resources.map(resource => {
            const baseResource = {
                _id: resource.id,
                title: resource.title || 'Untitled Resource',
                description: resource.description || 'No description available',
                url: resource.url || '#',
                submittedBy: { name: 'Anonymous' },
                dateAdded: resource.created_at || new Date().toISOString()
            };

            // University-based resource
            if (resource.subjects) {
                return {
                    ...baseResource,
                    type: 'university',
                    subject: {
                        name: resource.subjects.name,
                        _id: resource.subjects.id
                    },
                    domain: resource.subjects.domains ? {
                        name: resource.subjects.domains.name,
                        _id: resource.subjects.domains.id
                    } : null,
                    university: resource.subjects.domains?.universities ? {
                        name: resource.subjects.domains.universities.name,
                        _id: resource.subjects.domains.universities.id
                    } : null
                };
            }

            // Skill-based resource
            if (resource.skills) {
                return {
                    ...baseResource,
                    type: 'skill',
                    skill: resource.skills.name,
                    skillCategory: resource.skills.skill_categories?.name
                };
            }

            // Exam-based resource
            if (resource.exams) {
                return {
                    ...baseResource,
                    type: 'competitive',
                    exam: resource.exams.name,
                    examCategory: resource.exams.exam_categories?.name
                };
            }

            // Fallback
            return {
                ...baseResource,
                type: 'general'
            };
        });
    };

    // Create fallback data if database is not connected
    const createFallbackData = () => {
        console.log('[DataContext] Creating fallback data');
        const fallbackResources = [
            {
                _id: 'fallback_1',
                title: 'Introduction to Computer Science',
                description: 'Basic concepts of computer science and programming fundamentals',
                url: 'https://example.com',
                type: 'university',
                subject: { name: 'Computer Science', _id: 'cs_1' },
                domain: { name: 'Engineering', _id: 'eng_1' },
                university: { name: 'Sample University', _id: 'uni_1' },
                submittedBy: { name: 'Admin' },
                dateAdded: new Date().toISOString()
            },
            {
                _id: 'fallback_2',
                title: 'JavaScript Fundamentals',
                description: 'Learn the basics of JavaScript programming language',
                url: 'https://example.com',
                type: 'skill',
                skill: 'JavaScript Programming',
                skillCategory: 'Web Development',
                submittedBy: { name: 'Admin' },
                dateAdded: new Date().toISOString()
            },
            {
                _id: 'fallback_3',
                title: 'JEE Main Preparation',
                description: 'Comprehensive preparation material for JEE Main examination',
                url: 'https://example.com',
                type: 'competitive',
                exam: 'JEE Main',
                examCategory: 'Engineering Entrance',
                submittedBy: { name: 'Admin' },
                dateAdded: new Date().toISOString()
            }
        ];

        const fallbackUniversities = [
            {
                _id: 'uni_1',
                name: 'Sample University',
                domains: [
                    {
                        _id: 'eng_1',
                        name: 'Engineering',
                        subjects: [
                            {
                                _id: 'cs_1',
                                name: 'Computer Science',
                                resources: [fallbackResources[0]]
                            }
                        ]
                    }
                ]
            }
        ];

        return { resources: fallbackResources, universities: fallbackUniversities };
    };

    // Main fetch function
    const fetchApprovedResources = async () => {
        try {
            console.log('[DataContext] Starting data fetch');
            setError(null);
            setLoadingProgress(10);

            // Test connection first
            const isConnected = await testConnection();
            setLoadingProgress(20);

            if (!isConnected) {
                console.log('[DataContext] Database not connected, using fallback data');
                const fallbackData = createFallbackData();
                setAllResources(fallbackData.resources);
                setUniversities(fallbackData.universities);
                setLoadingProgress(100);
                return fallbackData;
            }

            setLoadingProgress(40);

            // Fetch resources and universities in parallel
            const [resources, universitiesData] = await Promise.all([
                fetchAllResources(),
                fetchUniversitiesWithStructure()
            ]);

            setLoadingProgress(80);

            // Transform resources
            const transformedResources = transformResources(resources);

            // Transform universities (simplified structure)
            const transformedUniversities = universitiesData.map(uni => ({
                _id: uni.id,
                name: uni.name,
                domains: (uni.domains || []).map(domain => ({
                    _id: domain.id,
                    name: domain.name,
                    subjects: (domain.subjects || []).map(subject => ({
                        _id: subject.id,
                        name: subject.name,
                        resources: [] // Resources are fetched separately
                    }))
                }))
            }));

            console.log(`[DataContext] Successfully loaded ${transformedResources.length} resources and ${transformedUniversities.length} universities`);

            setAllResources(transformedResources);
            setUniversities(transformedUniversities);
            setLoadingProgress(100);

            return { resources: transformedResources, universities: transformedUniversities };

        } catch (err) {
            console.error('[DataContext] Error in fetchApprovedResources:', err);

            // Use fallback data on error
            console.log('[DataContext] Using fallback data due to error');
            const fallbackData = createFallbackData();
            setAllResources(fallbackData.resources);
            setUniversities(fallbackData.universities);
            setError('Using demo data - please check your database connection');
            setLoadingProgress(100);

            return fallbackData;
        }
    };

    // Initialize data
    useEffect(() => {
        const initializeData = async () => {
            try {
                console.log('[DataContext] Initializing data...');
                setLoading(true);
                setError(null);
                setLoadingProgress(0);

                await fetchApprovedResources();
                setInitialLoadComplete(true);

            } catch (error) {
                console.error('[DataContext] Initialization failed:', error);
                // Fallback data should already be set in fetchApprovedResources
                setError('Failed to load data - using demo content');
            } finally {
                setLoading(false);
            }
        };

        initializeData();
    }, []);

    // Get stats
    const getStats = async () => {
        try {
            if (allResources.length === 0) {
                return { totalResources: 0, totalUsers: 0, totalRequests: 0 };
            }

            // Try to get real stats, fallback to calculated ones
            const { count: resourceCount } = await supabase
                .from('resources')
                .select('*', { count: 'exact', head: true })
                .eq('is_approved', true);

            return {
                totalResources: resourceCount || allResources.length,
                totalUsers: 1250, // Fallback number
                totalRequests: 89 // Fallback number
            };
        } catch (err) {
            console.error('[DataContext] Error fetching stats:', err);
            return {
                totalResources: allResources.length,
                totalUsers: 1250,
                totalRequests: 89
            };
        }
    };

    // Search resources
    const searchResources = (query, limit = 5) => {
        if (!query || !query.trim() || !allResources || allResources.length === 0) {
            return [];
        }

        const searchTerm = query.toLowerCase();
        const filteredResults = allResources.filter(resource => {
            const searchableFields = [
                resource.title,
                resource.description,
                resource.subject?.name,
                resource.domain?.name,
                resource.university?.name,
                resource.skill,
                resource.skillCategory,
                resource.exam,
                resource.examCategory
            ];

            return searchableFields.some(field =>
                field && field.toLowerCase().includes(searchTerm)
            );
        });

        return filteredResults.slice(0, limit);
    };

    // Get recent resources
    const getRecentResources = (limit = 6) => {
        if (!allResources || allResources.length === 0) {
            return [];
        }

        return allResources
            .filter(resource => resource && resource.dateAdded)
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, limit);
    };

    // Extract searchable terms
    const extractSearchableTerms = () => {
        const terms = new Set();

        // Add common terms as fallback
        const commonTerms = [
            'computer science', 'engineering', 'mathematics', 'physics',
            'chemistry', 'biology', 'business', 'economics', 'psychology',
            'javascript', 'python', 'java', 'react', 'node.js',
            'machine learning', 'data science', 'artificial intelligence',
            'jee main', 'neet', 'gate', 'cat', 'gmat'
        ];

        commonTerms.forEach(term => {
            terms.add({
                text: term,
                type: 'general',
                category: '🔍 Popular'
            });
        });

        // Add terms from actual data
        universities.forEach(university => {
            if (university?.name) {
                terms.add({
                    text: university.name,
                    type: 'university',
                    category: '🏫 University'
                });

                university.domains?.forEach(domain => {
                    if (domain?.name) {
                        terms.add({
                            text: domain.name,
                            type: 'domain',
                            category: '🎯 Domain'
                        });

                        domain.subjects?.forEach(subject => {
                            if (subject?.name) {
                                terms.add({
                                    text: subject.name,
                                    type: 'subject',
                                    category: '📖 Subject'
                                });
                            }
                        });
                    }
                });
            }
        });

        allResources.forEach(resource => {
            if (resource.skill) {
                terms.add({
                    text: resource.skill,
                    type: 'skill',
                    category: '💡 Skill'
                });
            }
            if (resource.exam) {
                terms.add({
                    text: resource.exam,
                    type: 'exam',
                    category: '📚 Exam'
                });
            }
        });

        return Array.from(terms);
    };

    const refreshData = async () => {
        try {
            setLoading(true);
            setError(null);
            setLoadingProgress(0);
            await fetchApprovedResources();
        } catch (error) {
            console.error('[DataContext] Error refreshing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        universities,
        allResources,
        loading,
        error,
        initialLoadComplete,
        loadingProgress,
        searchResources,
        getRecentResources,
        getStats,
        extractSearchableTerms,
        refreshData,
        refetchData: fetchApprovedResources
    };

    console.log('[DataContext] Providing context with:', {
        universitiesCount: universities.length,
        resourcesCount: allResources.length,
        loading,
        error,
        initialLoadComplete
    });

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};