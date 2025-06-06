import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../config/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/login');
      }
    });
  }, []);

  return null;
} 