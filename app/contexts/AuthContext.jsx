import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error details:', error);
        
        // Safely check error message
        const errorMessage = error.message || '';
        
        if (errorMessage.toLowerCase().includes('email not confirmed')) {
          throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
        }
        if (errorMessage.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        throw new Error(errorMessage || 'An error occurred during login');
      }

      if (!data?.user) {
        throw new Error('No user data received after login');
      }

      // Ensure user has a profile
      await ensureUserProfile(data.user);
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        if (error.message.includes('provider is not enabled')) {
          throw new Error('Google Sign-In is not configured. Please contact support.');
        }
        if (error.message.includes('redirect_uri_mismatch')) {
          throw new Error('Google Sign-In configuration error. Please contact support.');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  };

  const ensureUserProfile = async (user) => {
    try {
      if (!user?.id) {
        console.error('No user ID provided to ensureUserProfile');
        return;
      }

      console.log('Ensuring profile for user:', user.id);

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking profile:', profileError);
        return;
      }

      // If profile doesn't exist, create it
      if (!profile) {
        console.log('Profile not found, creating new profile...');
        
        const { data: createdProfile, error: insertError } = await supabase
          .rpc('create_user_profile', {
            p_id: user.id,
            p_user_id: user.id,
            p_full_name: user.user_metadata?.full_name || user.email.split('@')[0]
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw new Error(`Failed to create user profile: ${insertError.message}`);
        }

        console.log('Profile created successfully:', createdProfile);
      } else {
        console.log('Profile already exists:', profile);
      }
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
      throw error;
    }
  };

  const register = async (email, password, metadata) => {
    try {
      console.log('Starting registration process...');
      
      // 1. Create the auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }
      
      if (!authData?.user) {
        console.error('No user data returned from signUp');
        throw new Error('Failed to create user account');
      }

      console.log('Auth user created successfully:', authData.user.id);

      // 2. Create the profile with minimal information
      const { data: createdProfile, error: profileError } = await supabase
        .rpc('create_user_profile', {
          p_id: authData.user.id,
          p_user_id: authData.user.id,
          p_full_name: metadata.full_name
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        
        // If profile creation fails, we should clean up the auth user
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log('Cleaned up auth user after profile creation failure');
        } catch (cleanupError) {
          console.error('Error cleaning up auth user:', cleanupError);
        }

        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log('Profile created successfully:', createdProfile);

      // Return the auth data with a flag indicating profile completion is needed
      return {
        ...authData,
        needsProfileCompletion: true,
        message: 'Registration successful! Please complete your profile.'
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 