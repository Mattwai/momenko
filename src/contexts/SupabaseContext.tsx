import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, initializeSupabase } from '../lib/supabase';
import { userService, culturalService } from '../services/supabase';
import { CulturalProfile } from '../types';

interface SupabaseContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  culturalProfile: CulturalProfile | null;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  session: null,
  userProfile: null,
  culturalProfile: null,
  isLoading: true,
  error: null,
  refreshUser: async () => {},
  refreshProfile: async () => {}
});

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [culturalProfile, setCulturalProfile] = useState<CulturalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshUser = async () => {
    try {
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const profile = await userService.getUserProfile(currentUser.id);
        setUserProfile(profile);

        if (profile?.cultural_profile_id) {
          const culturalData = await culturalService.getCulturalProfile(profile.cultural_profile_id);
          setCulturalProfile(culturalData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh user'));
    }
  };

  const refreshProfile = async () => {
    try {
      if (user) {
        const profile = await userService.getUserProfile(user.id);
        setUserProfile(profile);

        if (profile?.cultural_profile_id) {
          const culturalData = await culturalService.getCulturalProfile(profile.cultural_profile_id);
          setCulturalProfile(culturalData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh profile'));
    }
  };

  useEffect(() => {
    setIsLoading(true);
    
    // Initialize Supabase session
    initializeSupabase().then((initialSession) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);
      setSession(newSession);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsLoading(true);
        if (newSession?.user) {
          setUser(newSession.user);
          await refreshUser();
        }
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setCulturalProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    userProfile,
    culturalProfile,
    isLoading,
    error,
    refreshUser,
    refreshProfile
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}; 