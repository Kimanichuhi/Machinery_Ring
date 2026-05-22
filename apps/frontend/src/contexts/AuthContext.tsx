import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: AppRole;
  localMrId?: string;
  localMrName?: string;
  status: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile and role. If the profile row is missing, fall back to auth metadata
  // so a valid Supabase session does not get trapped on the login screen.
  const fetchUserData = async (authUser: SupabaseUser): Promise<AuthUser | null> => {
    try {
      const userId = authUser.id;

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Get role
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching role:', roleError);
      }

      const role: AppRole = userRole?.role || 'tot';

      // Get local MR assignment if applicable
      let localMrId: string | undefined;
      let localMrName: string | undefined;

      if (role === 'tot' || role === 'local_mr_coordinator') {
        const { data: assignment } = await supabase
          .from('tot_assignments')
          .select('local_mr_id, local_mrs(name)')
          .eq('tot_id', userId)
          .eq('status', 'active')
          .single();

        if (assignment) {
          localMrId = assignment.local_mr_id;
          localMrName = (assignment.local_mrs as any)?.name;
        }

        // For coordinators, also check local_mrs table
        if (role === 'local_mr_coordinator') {
          const { data: coordMr } = await supabase
            .from('local_mrs')
            .select('id, name')
            .eq('coordinator_id', userId)
            .single();

          if (coordMr) {
            localMrId = coordMr.id;
            localMrName = coordMr.name;
          }
        }
      }

      return {
        id: userId,
        email: profile?.email || authUser.email || '',
        name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        phone: profile?.phone || authUser.user_metadata?.phone || undefined,
        role,
        localMrId,
        localMrName,
        status: profile?.status || 'active',
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSession = async (session: Session | null) => {
      if (!isMounted) return;

      setSession(session);

      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const userData = await fetchUserData(session.user);
      if (!isMounted) return;

      setUser(userData);
      setIsLoading(false);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Defer Supabase calls so auth state changes do not deadlock the client.
        setTimeout(() => {
          loadSession(session).catch((error) => {
            console.error(`Auth state load failed after ${event}:`, error);
            if (isMounted) {
              setUser(null);
              setIsLoading(false);
            }
          });
        }, 0);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => loadSession(session))
      .catch((error) => {
        console.error('Initial auth session load failed:', error);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }
      
      // Check if user is active before allowing login
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', data.user.id)
          .maybeSingle();
        
        if (profile?.status === 'inactive') {
          // Sign out immediately if user is inactive
          await supabase.auth.signOut();
          return { error: new Error('Your account has been deactivated. Please contact an administrator.') };
        }

        const userData = await fetchUserData(data.user);
        if (!userData) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          return { error: new Error('Unable to load your user profile. Please contact an administrator.') };
        }

        setSession(data.session);
        setUser(userData);
        setIsLoading(false);
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            phone,
          },
        },
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsLoading(false);
  };

  // Admin is the ONLY role that can create/edit/delete data
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!session && !!user,
        isAdmin,
        canEdit,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
