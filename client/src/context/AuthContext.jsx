import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Fetch user profile from database
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, that's okay - we'll create it
        if (error.code === 'PGRST116') {
          console.log('User profile not found, will create one');
          return null;
        }
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  // Create or update user profile
  const upsertUserProfile = async (user) => {
    try {
      const profileData = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error upserting user profile:', error);
        // Don't throw error, profile creation is optional
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in upsertUserProfile:', error);
      return null;
    }
  };

  // Handle profile operations with proper error handling - memoized
  const handleUserProfile = useCallback(async (user) => {
    if (!user) return;

    try {
      // First try to fetch existing profile
      let profile = await fetchUserProfile(user.id);

      // If no profile exists, create one
      if (!profile) {
        profile = await upsertUserProfile(user);
      }

      // Set profile regardless of success/failure
      setUserProfile(profile);
    } catch (error) {
      console.error('Error handling user profile:', error);
      // Continue without profile - don't block user from using the app
      setUserProfile(null);
    }
  }, []); // Empty dependency array since it only depends on the async functions

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user || null);

          if (session?.user) {
            // Handle profile in background - don't block the UI
            handleUserProfile(session.user);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (!mounted) return;

        setSession(session);
        setUser(session?.user || null);

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in');
            if (session?.user) {
              // Handle profile in background
              handleUserProfile(session.user);
            }
            break;
          case 'SIGNED_OUT':
            console.log('User signed out');
            setUserProfile(null);
            // Clear all localStorage data related to the app
            localStorage.removeItem('savedResources');
            // Clear any other app-specific data
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('supabase.') || key.startsWith('sb-')) {
                localStorage.removeItem(key);
              }
            });
            break;
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed');
            break;
          case 'USER_UPDATED':
            console.log('User updated');
            if (session?.user) {
              handleUserProfile(session.user);
            }
            break;
          default:
            break;
        }

        // Always ensure loading is false after auth events
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleUserProfile]); // Now properly included in dependency array

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  // Sign in with email
  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  // Sign up with email
  const signUpWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    }
  };

  // Sign out - FIXED VERSION
  const signOut = async () => {
    try {
      setLoading(true);

      // Clear local state immediately to prevent UI issues
      setUser(null);
      setUserProfile(null);
      setSession(null);

      // Sign out from Supabase with global scope to clear all sessions
      const { error } = await supabase.auth.signOut({
        scope: 'global'  // This ensures all sessions are cleared
      });

      if (error) {
        console.error('Supabase sign out error:', error);
        throw error;
      }

      // Clear localStorage items
      localStorage.removeItem('savedResources');

      // Clear all Supabase-related localStorage entries
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });

    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  // Update password
  const updatePassword = async (password) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  };

  // Check if user has valid session
  const isAuthenticated = () => {
    return !!(session && user && !loading);
  };

  // Check if user is admin
  const isAdmin = () => {
    return userProfile?.role === 'admin';
  };

  // Get access token
  const getAccessToken = () => {
    return session?.access_token || null;
  };

  // Refresh session manually if needed
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Refresh session error:', error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated,
    isAdmin,
    getAccessToken,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};