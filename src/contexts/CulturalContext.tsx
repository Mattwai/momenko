import React, { createContext, useContext, useState, useEffect } from 'react';
import { CulturalProfile, PreferredLanguage, CulturalGroup } from '../types';
import { DEFAULT_CULTURAL_PROFILES } from '../types/cultural';

interface CulturalContextType {
  culturalProfile: CulturalProfile;
  updateCulturalProfile: (profile: Partial<CulturalProfile>) => void;
  setPreferredLanguage: (language: PreferredLanguage) => void;
}

// Generate a unique ID for the default profile
const generateProfileId = () => `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const defaultCulturalProfile: CulturalProfile = {
  id: generateProfileId(),
  ...DEFAULT_CULTURAL_PROFILES.western,
};

const CulturalContext = createContext<CulturalContextType>({
  culturalProfile: defaultCulturalProfile,
  updateCulturalProfile: () => {},
  setPreferredLanguage: () => {},
});

export const useCulturalContext = () => useContext(CulturalContext);

interface CulturalProviderProps {
  children: React.ReactNode;
}

export const CulturalProvider: React.FC<CulturalProviderProps> = ({ children }) => {
  const [culturalProfile, setCulturalProfile] = useState<CulturalProfile>(defaultCulturalProfile);

  // Load cultural profile from storage on mount
  useEffect(() => {
    loadCulturalProfile();
  }, []);

  const loadCulturalProfile = async () => {
    try {
      // TODO: Implement loading from AsyncStorage or your preferred storage solution
      // const storedProfile = await AsyncStorage.getItem('culturalProfile');
      // if (storedProfile) {
      //   setCulturalProfile(JSON.parse(storedProfile));
      // }
    } catch (error) {
      console.error('Error loading cultural profile:', error);
    }
  };

  const saveCulturalProfile = async (profile: CulturalProfile) => {
    try {
      // TODO: Implement saving to AsyncStorage or your preferred storage solution
      // await AsyncStorage.setItem('culturalProfile', JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving cultural profile:', error);
    }
  };

  const updateCulturalProfile = (updates: Partial<CulturalProfile>) => {
    const updatedProfile = { ...culturalProfile, ...updates };
    setCulturalProfile(updatedProfile);
    saveCulturalProfile(updatedProfile);
  };

  const setPreferredLanguage = (language: PreferredLanguage) => {
    const culturalGroup: CulturalGroup = 
      language === 'mi' ? 'maori' :
      language === 'zh' ? 'chinese' : 'western';

    const defaultProfile = DEFAULT_CULTURAL_PROFILES[culturalGroup];
    updateCulturalProfile({
      ...defaultProfile,
      id: culturalProfile.id, // Preserve the existing ID
    });
  };

  return (
    <CulturalContext.Provider
      value={{
        culturalProfile,
        updateCulturalProfile,
        setPreferredLanguage,
      }}
    >
      {children}
    </CulturalContext.Provider>
  );
}; 