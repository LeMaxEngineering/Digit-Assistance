import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../config/supabase';
import { DataTable, Portal, Modal, Button, IconButton } from 'react-native-paper';
import globalStyles from '../styles/globalStyles';
import colors from '../styles/colors';
import { documentManager } from '../utils/documentUtils';

const HistoryDetail = () => {
  const { id } = useLocalSearchParams();
  const [document, setDocument] = useState(null);
  const [company, setCompany] = useState(null);
  const [profile, setProfile] = useState(null);
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDocumentDetails = async () => {
      setLoading(true);
      try {
        console.log('Fetching document with ID:', id);
        // Fetch document with its details and company info
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single();
        if (docError) {
          console.error('Error fetching document:', docError);
          throw docError;
        }
        setDocument(docData);
        // Fetch company
        if (docData.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', docData.company_id)
            .single();
          if (!companyError) setCompany(companyData);
        }
        // Fetch place
        if (docData.place_id) {
          const { data: placeData, error: placeError } = await supabase
            .from('places')
            .select('name')
            .eq('id', docData.place_id)
            .single();
          if (!placeError) setPlace(placeData);
        }
        // Fetch profile
        if (docData.user_id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', docData.user_id)
            .single();
          if (!profileError) setProfile(profileData);
        }
        // Fetch worker details
        const { data: workerData, error: workerError } = await supabase
          .from('documents_details')
          .select('*')
          .eq('document_id', id)
          .order('id');
        if (!workerError) {
          setDocument(prev => ({ ...prev, documents_details: workerData }));
        }
      } catch (error) {
        console.error('Error in fetchDocumentDetails:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDocumentDetails();
  }, [id]);

  // Add a debug log for the document state
  useEffect(() => {
    console.log('Document state updated:', {
      id: document?.id,
      hasDetails: !!document?.documents_details,
      detailsLength: document?.documents_details?.length
    });
  }, [document]);

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Add a helper to format time to HH:MM
  const formatTimeHHMM = (timeString) => {
    if (!timeString) return '-';
    // Handles both 'HH:MM' and 'HH:MM:SS' formats
    const [hh, mm] = timeString.split(':');
    if (hh && mm) return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
    return timeString;
  };

  const handleDeleteDocument = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { success, error } = await documentManager.deleteDocument(id);
      
      if (!success) {
        throw error;
      }

      setDeleteDialogVisible(false);
      router.replace('/document/history');
    } catch (error) {
      setError('Failed to delete document: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ImageBackground source={require('../assets/images/splash01.png')} style={globalStyles.backgroundImage}>
        <View style={globalStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ImageBackground>
    );
  }

  if (!document) {
    return (
      <ImageBackground source={require('../assets/images/splash01.png')} style={globalStyles.backgroundImage}>
        <View style={[globalStyles.content, globalStyles.formBox]}>
          <Text style={globalStyles.errorText}>Document not found.</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../assets/images/splash01.png')} style={globalStyles.backgroundImage}>
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[globalStyles.content, globalStyles.formBox]}>
          {/* Document Header */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[globalStyles.sectionTitle, { color: colors.primary }]}>
                Document Details
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconButton
                  icon="delete"
                  iconColor={colors.error}
                  size={24}
                  onPress={() => {
                    console.log('Delete button pressed for document:', id);
                    setDeleteDialogVisible(true);
                  }}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    margin: 0,
                    padding: 0,
                  }}
                />
              </View>
            </View>
            <View style={{ backgroundColor: '#f5f7fa', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
                  {company?.name || 'Unknown Company'}
                </Text>
                <Text style={{ fontSize: 14, color: '#666' }}>
                  {formatDate(document?.document_date)}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                Place: <Text style={{ fontWeight: 'bold', color: '#000' }}>{place?.name || 'N/A'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                Created by: {profile?.full_name || 'Unknown User'}
              </Text>
              <Text style={{ fontSize: 12, color: '#888' }}>
                Created: {document?.created_at ? new Date(document.created_at).toLocaleString() : ''}
              </Text>
            </View>
          </View>

          {/* Workers Table */}
          <View>
            <Text style={[globalStyles.sectionTitle, { color: colors.primary, marginBottom: 16 }]}>
              Worker Records
            </Text>

            {document?.documents_details && document.documents_details.length > 0 ? (
              <DataTable style={{ backgroundColor: '#f5f7fa', borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' }}>
                <DataTable.Header>
                  <DataTable.Title style={{ flex: 2 }}><Text style={{ color: '#000', fontWeight: 'bold' }}>Name</Text></DataTable.Title>
                  <DataTable.Title style={{ flex: 1 }}><Text style={{ color: '#000', fontWeight: 'bold' }}>Start</Text></DataTable.Title>
                  <DataTable.Title style={{ flex: 1 }}><Text style={{ color: '#000', fontWeight: 'bold' }}>End</Text></DataTable.Title>
                </DataTable.Header>

                {document.documents_details.map((worker, index) => (
                  <DataTable.Row key={worker.id || index}>
                    <DataTable.Cell style={{ flex: 2 }}><Text>{worker.worker_name}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1 }}><Text>{formatTimeHHMM(worker.time_start)}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1 }}><Text>{formatTimeHHMM(worker.time_end)}</Text></DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            ) : (
              <View style={{ backgroundColor: '#f5f7fa', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' }}>
                <Text style={{ textAlign: 'center', color: '#666' }}>No worker records found</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
            <TouchableOpacity 
              style={[globalStyles.button, { flex: 1, marginRight: 8 }]} 
              onPress={() => router.back()}
            >
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Back to History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Modal
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
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
          {document && (
            <Text style={{ marginBottom: 16, color: '#666' }}>
              Company: {company?.name || 'Unknown Company'}{'\n'}
              Place: {place?.name || 'N/A'}{'\n'}
              Date: {formatDate(document.document_date)}
            </Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button
              onPress={() => setDeleteDialogVisible(false)}
              style={{ marginRight: 8 }}
              mode="contained"
              buttonColor="#666"
              textColor="white"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onPress={handleDeleteDocument}
              mode="contained"
              buttonColor={colors.error}
              textColor="white"
              loading={deleting}
              disabled={deleting}
            >
              Delete
            </Button>
          </View>
        </Modal>
      </Portal>
    </ImageBackground>
  );
};

export default HistoryDetail; 