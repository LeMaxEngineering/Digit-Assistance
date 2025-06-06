import { Stack } from 'expo-router';
import { AuthProvider } from './contexts/AuthContext';
import { PaperProvider } from 'react-native-paper';
import ProtectedRoute from './components/ProtectedRoute';
import { DocumentProvider } from './contexts/DocumentContext';
import Footer from './components/Footer';

export default function RootLayout() {
  return (
    <PaperProvider>
      <AuthProvider>
        <DocumentProvider>
          <ProtectedRoute>
            <Stack>
              {/* Auth Group */}
              <Stack.Screen 
                name="auth/login" 
                options={{ 
                  headerShown: false 
                }} 
              />
              <Stack.Screen 
                name="auth/register" 
                options={{ 
                  headerShown: false 
                }} 
              />

              {/* Protected Routes */}
              <Stack.Screen 
                name="dashboard" 
                options={{ 
                  headerShown: false 
                }} 
              />
              <Stack.Screen 
                name="document" 
                options={{ 
                  headerShown: false 
                }} 
              />
              <Stack.Screen 
                name="document/edit" 
                options={{ 
                  headerShown: false 
                }} 
              />
              <Stack.Screen 
                name="document/history" 
                options={{ 
                  headerShown: false 
                }} 
              />
            </Stack>
            <Footer />
          </ProtectedRoute>
        </DocumentProvider>
      </AuthProvider>
    </PaperProvider>
  );
} 