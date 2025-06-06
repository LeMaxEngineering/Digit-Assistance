import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ImageBackground, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, IconButton, Portal, Modal, Button, Menu } from 'react-native-paper';
import globalStyles from '../styles/globalStyles';
import colors from '../styles/colors';
import { documentManager } from '../utils/documentUtils';

const DocumentHistory = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          setProfile(data);
        }
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setCompanies(data);
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          companies (
            name
          ),
          place:places (
            name
          )
        `)
        .eq('user_id', user?.id)
        // Sort by document date first (newest to oldest), then by creation date
        .order('document_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (!error) {
        setDocuments(data);
        setFilteredDocuments(data);
      }
      setLoading(false);
      if (error) setError(error.message);
    };
    if (user) fetchDocuments();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      setFilteredDocuments(documents.filter(doc => doc.company_id === selectedCompany));
    } else {
      setFilteredDocuments(documents);
    }
  }, [selectedCompany, documents]);

  const handleDocumentPress = (doc) => {
    router.push({ pathname: '/document/historyDetail', params: { id: doc.id } });
  };

  const handleDeleteDocument = async (doc) => {
    setDocumentToDelete(doc);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      setLoading(true);
      const { success, error } = await documentManager.deleteDocument(documentToDelete.id);
      
      if (!success) {
        throw error;
      }

      setDocuments(documents.filter(d => d.id !== documentToDelete.id));
      setDeleteDialogVisible(false);
      setDocumentToDelete(null);
    } catch (error) {
      setError('Failed to delete document: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    setDocumentToDelete(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <ImageBackground source={require('../assets/images/splash01.png')} style={globalStyles.backgroundImage}>
      {loading && (
        <View style={globalStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={[globalStyles.content, globalStyles.formBox]}>
          <Text style={[globalStyles.sectionTitle, { color: colors.primary, marginBottom: 16 }]}>
            Document History
          </Text>
          {error ? (
            <Text style={globalStyles.errorText}>{error}</Text>
          ) : null}
          
          {/* Company Filter */}
          <View style={{ marginBottom: 16 }}>
            {Platform.OS === 'web' ? (
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  border: `1px solid ${colors.primary}`,
                  background: '#fff',
                  color: colors.primary,
                  fontWeight: 'bold',
                }}
              >
                <option value="">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            ) : (
              <Menu
                visible={showCompanyMenu}
                onDismiss={() => setShowCompanyMenu(false)}
                anchor={
                  <TouchableOpacity 
                    onPress={() => setShowCompanyMenu(true)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.primary,
                      backgroundColor: '#fff',
                    }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                      {selectedCompany ? companies.find(c => c.id === selectedCompany)?.name : 'All Companies'}
                    </Text>
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedCompany(null);
                    setShowCompanyMenu(false);
                  }}
                  title="All Companies"
                />
                {companies.map(company => (
                  <Menu.Item
                    key={company.id}
                    onPress={() => {
                      setSelectedCompany(company.id);
                      setShowCompanyMenu(false);
                    }}
                    title={company.name}
                  />
                ))}
              </Menu>
            )}
          </View>

          <View>
            <FlatList
              data={filteredDocuments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => handleDocumentPress(item)} 
                  style={{ 
                    backgroundColor: '#f5f7fa', 
                    borderRadius: 12, 
                    padding: 16, 
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#e0e0e0'
                  }}
                >
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4
                  }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: 'bold',
                      color: colors.primary,
                      flex: 1
                    }}>
                      {item.companies?.name || 'Unknown Company'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ 
                      fontSize: 14, 
                      color: '#666',
                        marginRight: 8
                    }}>
                      {formatDate(item.document_date)}
                    </Text>
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={colors.error}
                        onPress={() => handleDeleteDocument(item)}
                        style={{ margin: 0, padding: 0 }}
                      />
                    </View>
                  </View>
                  <Text style={{ 
                    fontSize: 13, 
                    color: '#555',
                    marginBottom: 8
                  }}>
                    Created by: {profile?.full_name || user?.email || 'Unknown User'}
                  </Text>
                  <Text style={{ 
                    fontSize: 12, 
                    color: '#888' 
                  }}>
                    Created: {new Date(item.created_at).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
          <TouchableOpacity 
            style={[globalStyles.button, { marginTop: 16 }]} 
            onPress={() => router.push('/dashboard')}
          >
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Modal
          visible={deleteDialogVisible}
          onDismiss={cancelDelete}
          contentContainerStyle={{
            backgroundColor: 'white',
            padding: 20,
            margin: 20,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: colors.error }}>
            Delete Document
          </Text>
          <Text style={{ marginBottom: 8, fontWeight: 'bold', color: colors.error }}>
            Are you sure you want to delete this document?
          </Text>
          {documentToDelete && (
            <Text style={{ marginBottom: 16, color: '#666' }}>
              Company: {documentToDelete.companies?.name || 'Unknown Company'}{'\n'}
              Place: {documentToDelete.place?.name || 'N/A'}{'\n'}
              Date: {formatDate(documentToDelete.document_date)}
            </Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button
              onPress={cancelDelete}
              style={{ marginRight: 8 }}
              mode="contained"
              buttonColor="#666"
              textColor="white"
            >
              Cancel
            </Button>
            <Button
              onPress={confirmDelete}
              mode="contained"
              buttonColor={colors.error}
              textColor="white"
            >
              Delete
            </Button>
          </View>
        </Modal>
      </Portal>
    </ImageBackground>
  );
};

export default DocumentHistory; 