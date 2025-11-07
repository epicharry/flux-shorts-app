import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || 'https://fdjwelyppeygkdybihzx.supabase.co';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkandlbHlwcGV5Z2tkeWJpaHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTcwMDIsImV4cCI6MjA3ODA3MzAwMn0.9crxunFp_SeOVoZBiPd-8pokOiRcsJNULmf7BLp4V5Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // important for RN
  },
});

// -------------------------------
// Auth Helpers
// -------------------------------

// Sign up a new user
export async function signUp(email: string, password: string, name?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // optional metadata
    },
  });
  if (error) throw error;
  return data;
}

// Log in existing user
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Get current logged-in user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Log out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
