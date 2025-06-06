import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Image, Platform, Dialog, Alert } from 'react-native';
import { Text, Button, TextInput, Card, ActivityIndicator, Checkbox, Snackbar, DataTable, HelperText, Menu, Portal, Modal, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import globalStyles from '../styles/globalStyles';
import colors from '../styles/colors';
import documentParser, { parseScannedDocument } from '../utils/documentParser';
import { exportToPDF } from '../utils/export';
import { supabase } from '../config/supabase';
import { useDocument } from '../contexts/DocumentContext';
import { filterTimeInput, autoFormatToHHmm, isValidTimeHHmm, normalizeEndTimeIfNeeded, parseAndFormatTime } from '../utils/timeUtils';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendDocumentEmail } from '../services/emailService';

const EXPORT_FORMATS = [
  { label: 'PDF', value: 'pdf' },
  { label: 'CSV', value: 'csv' },
  { label: 'Excel', value: 'xls' },
];

function FilePreviewModal({ visible, file, format, onClose, onConfirm, data }) {
  const [pdfUrl, setPdfUrl] = React.useState(null);
  React.useEffect(() => {
    if (format === 'pdf' && file && Platform.OS === 'web') {
      // Ensure the Blob has the correct MIME type
      let blob = file;
      if (file && file.type !== 'application/pdf') {
        blob = new Blob([file], { type: 'application/pdf' });
      }
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, format]);

  // Debug logs
  React.useEffect(() => {
    console.log('FilePreviewModal file:', file);
    console.log('FilePreviewModal file type:', file?.type);
    console.log('FilePreviewModal pdfUrl:', pdfUrl);
  }, [file, pdfUrl]);

  // For CSV/XLSX preview
  let tableRows = [];
  if ((format === 'csv' || format === 'xls') && file) {
    let text = '';
    if (format === 'csv') {
      if (typeof file === 'string') {
        text = file;
      } else if (file instanceof Blob) {
        text = '';
      }
      if (text) tableRows = text.split('\n').map(row => row.split(','));
      else if (data && data.length) {
        const headers = Object.keys(data[0]);
        tableRows = [headers, ...data.map(row => headers.map(h => row[h]))];
      }
    } else if (format === 'xls' && data && data.length) {
      const headers = Object.keys(data[0]);
      tableRows = [headers, ...data.map(row => headers.map(h => row[h]))];
    }
  }

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onClose} 
        contentContainerStyle={[
          globalStyles.modal,
          { 
            backgroundColor: '#fff',
            margin: 24,
            borderRadius: 12,
            padding: 16,
            maxHeight: '90vh'
          }
        ]}
      >
        <Text style={[globalStyles.sectionTitle, { color: colors.primary, marginBottom: 16 }]}>Document Preview</Text>
        {format === 'pdf' && Platform.OS === 'web' && pdfUrl && (
          <View style={{ flex: 1, minHeight: 500, backgroundColor: '#f5f7fa', borderRadius: 8, overflow: 'hidden' }}>
            <iframe 
              src={pdfUrl} 
              width="100%" 
              height="500px" 
              title="PDF Preview" 
              style={{ border: 'none', flex: 1 }} 
            />
            {/* Fallback download link */}
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.info, marginBottom: 4 }}>If the PDF is not visible, <a href={pdfUrl} download="preview.pdf" style={{ color: colors.primary, textDecorationLine: 'underline' }}>click here to download the PDF</a>.</Text>
            </View>
          </View>
        )}
        {format === 'pdf' && Platform.OS !== 'web' && (
          <Text style={[globalStyles.infoText, { color: colors.error }]}>PDF preview is not available on this platform. Please download to view.</Text>
        )}
        {(format === 'csv' || format === 'xls') && tableRows.length > 0 && (
          <ScrollView horizontal style={{ maxHeight: 400, backgroundColor: '#f5f7fa', borderRadius: 8 }}>
            <View>
              {tableRows.map((row, i) => (
                <View key={i} style={{ flexDirection: 'row' }}>
                  {row.map((cell, j) => (
                    <Text 
                      key={j} 
                      style={{ 
                        padding: 8, 
                        minWidth: 100, 
                        borderWidth: 0.5, 
                        borderColor: '#ddd',
                        backgroundColor: i === 0 ? colors.primary : '#fff',
                        color: i === 0 ? '#fff' : '#000',
                        fontWeight: i === 0 ? 'bold' : 'normal'
                      }}
                    >
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 }}>
          <Button 
            mode="outlined" 
            onPress={onClose} 
            style={[globalStyles.button, { marginRight: 8 }]}
            labelStyle={{ color: colors.primary, fontWeight: 'bold' }}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={onConfirm}
            style={[globalStyles.button, globalStyles.primaryButton]}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
          >
            Send/Save
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

export default function ProcessScreen() {
  const { documentData, setDocumentData } = useDocument();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [saveLocal, setSaveLocal] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [editableWorkers, setEditableWorkers] = useState([]);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const isWeb = Platform.OS === 'web';
  const [generatedFile, setGeneratedFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
      return;
    }
  }, [user, authLoading]);

  // Add debug useEffect for parsing
  useEffect(() => {
    if (!user || authLoading) return;
    
    console.log('Processing document data:', {
      hasDocumentData: !!documentData,
      hasRecords: !!documentData?.records,
      recordsType: documentData?.records ? typeof documentData.records : 'undefined',
      recordsLength: documentData?.records?.length || 0
    });

    // Only show error if we have no records at all
    if (!documentData?.records || documentData.records.length === 0) {
      console.log('No records found in document data');
      setError('No valid records found. Please scan the document again.');
      setLoading(false);
      return;
    }

    try {
      // Convert the records from scanner format to the format expected by the UI
      const workers = documentData.records
        .map((record, index) => ({
          id: index + 1,
          name: record.name,
          timeIn: parseAndFormatTime(record.timeIn),
          timeOut: parseAndFormatTime(record.timeOut),
          page: 1 // Since we're not tracking pages in the scanner
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort workers by name

      console.log('Processed workers:', workers);

      setParsed({
        date: documentData.scanned_date || documentData.document_date,
        workers: workers,
        warnings: [] // We can add warnings if needed
      });
      setEditableWorkers(workers);
      setLoading(false);
    } catch (error) {
      console.error('[PROCESS] Error processing records:', error);
      setError('Error processing document. Please try again.');
      setLoading(false);
    }
  }, [documentData, user, authLoading]);

  // Add failsafe timeout to clear loading if stuck
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      setLoading(false);
      setError('Processing timed out. Please try again or check your document format.');
    }, 15000); // 15 seconds
    return () => clearTimeout(timeout);
  }, [loading]);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  // Normalize end time if needed
  function normalizeEndTime(start, end) {
    if (!start || !end) return end;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (
      !isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em) &&
      (eh < sh || (eh === sh && em < sm)) && // end time is before start time
      eh < 12 // end hour is in the morning
    ) {
      return `${eh + 12}:${em.toString().padStart(2, '0')}`;
    }
    return end;
  }

  const handleWorkerTimeChange = (idx, field, value) => {
    const updated = [...editableWorkers];
    updated[idx] = {
      ...updated[idx],
      [field]: parseAndFormatTime(value)
    };
    setEditableWorkers(updated);
  };

  const handleDeleteWorker = (idx) => {
    setWorkerToDelete(idx);
    setDeleteDialogVisible(true);
  };

  const confirmDeleteWorker = () => {
    if (workerToDelete !== null) {
      const updated = editableWorkers.filter((_, i) => i !== workerToDelete);
      setEditableWorkers(updated);
    }
    setDeleteDialogVisible(false);
    setWorkerToDelete(null);
  };

  const cancelDeleteWorker = () => {
    setDeleteDialogVisible(false);
    setWorkerToDelete(null);
  };

  const handleGenerate = async () => {
    if (!user) {
      setError('You must be logged in to generate documents.');
      setShowSnackbar(true);
      return;
    }

    setError('');
    setEmailError('');
    if (!saveLocal && !email) {
      setEmailError('Email is required unless saving locally.');
      return;
    }
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    // Validate required data
    if (!documentData?.company_id) {
      setError('Company information is missing. Please start over.');
      return;
    }

    if (!editableWorkers || editableWorkers.length === 0) {
      setValidationMessage('No employee records to process. Please scan the document again.');
      setValidationModalVisible(true);
      return;
    }

    // Check for empty entries
    // const emptyEntries = editableWorkers.filter(w => w.timeIn && !w.timeOut);
    // if (emptyEntries.length > 0) {
    //   setValidationMessage('Please check the time entries for all workers. End time must be after start time');
    //   setValidationModalVisible(true);
    //   return;
    // }

    // Validate worker data
    const invalidWorkers = editableWorkers.filter(w => {
      // Rule 1: If start time exists, it must be valid
      if (w.timeIn && !isValidTimeHHmm(w.timeIn)) {
        console.log('Invalid worker - invalid start time:', w);
        return true;
      }

      // Rule 2: If end time exists, it must be valid
      if (w.timeOut && !isValidTimeHHmm(w.timeOut)) {
        console.log('Invalid worker - invalid end time:', w);
        return true;
      }

      // Rule 3: If both times exist, end time must be later than start time
      if (w.timeIn && w.timeOut) {
        const [inHours, inMinutes] = w.timeIn.split(':').map(Number);
        const [outHours, outMinutes] = w.timeOut.split(':').map(Number);
        const inTotalMinutes = inHours * 60 + inMinutes;
        const outTotalMinutes = outHours * 60 + outMinutes;
        if (outTotalMinutes <= inTotalMinutes) {
          console.log('Invalid worker - end time before start time:', w);
          return true;
        }
      }

      return false;
    });

    console.log('Invalid workers found:', invalidWorkers.length);
    if (invalidWorkers.length > 0) {
      console.log('Showing alert for invalid workers');
      setValidationMessage('Please check the time entries for all workers. End time must be after start time');
      setValidationModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      // 1. Validate company exists
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', documentData.company_id)
        .single();

      if (companyError) {
        throw new Error('Invalid company selected. Please try again.');
      }

      // 2. Validate user profile exists
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, create it using the auth user ID
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id, // This is the auth.users.id from Supabase
            full_name: user.user_metadata?.full_name || user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('Profile creation error:', createError);
          throw new Error('Failed to create user profile. Please contact support.');
        }
        profile = newProfile;
      }

      // 3. Save header to documents (match schema)
      const { company_id } = documentData;
      let docDate = parsed?.date || documentData.document_date || documentData.date;
      
      // Convert date from MM/DD/YYYY to YYYY-MM-DD if needed
      if (docDate && docDate.includes('/')) {
        const [month, day, year] = docDate.split('/');
        docDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Validate date format
      if (!docDate || !/^\d{4}-\d{2}-\d{2}$/.test(docDate)) {
        throw new Error('Invalid document date format. Please try again.');
      }

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id, // This is the auth.users.id from Supabase
          company_id,
          status: 'processed',
          document_date: docDate,
          place_id: documentData.place_id // Add the place_id from documentData
        })
        .select()
        .single();

      if (docError) {
        if (docError.code === '23503') { // Foreign key violation
          throw new Error('Invalid user or company. Please ensure you have the correct permissions.');
        }
        if (docError.code === '23505' && docError.message.includes('unique_company_date_place')) {
          throw new Error('A document already exists for this company, date, and place. Please select a different date or place, update the existing document, or delete the stored document.');
        }
        throw docError;
      }

      // 4. Save details to documents_details (match schema)
      const details = editableWorkers.map(w => ({
        document_id: doc.id,
        worker_name: w.name,
        time_start: w.timeIn || null,  // Convert empty string to null
        time_end: w.timeOut || null    // Convert empty string to null
      }));

      console.log('Saving details to database:', details);

      const { error: detError } = await supabase
        .from('documents_details')
        .insert(details);

      if (detError) {
        console.error('Error saving details:', detError);
        // If details insert fails, try to clean up the document
        await supabase
          .from('documents')
          .delete()
          .eq('id', doc.id);
        throw new Error('Failed to save employee records. Please try again.');
      }

      // 5. Generate file (all formats)
      let fileBlob = null;
      try {
        if (exportFormat === 'pdf') {
          const doc = new jsPDF();
          
          // Add title
          doc.setFontSize(16);
          doc.text('Attendance Record', 14, 15);
          
          // Add document info
          doc.setFontSize(10);
          doc.text(`Company: ${company.name}`, 14, 25);
          doc.text(`Place: ${documentData.place_name || documentData.place || company.name}`, 14, 30);
          doc.text(`Date: ${new Date(docDate).toLocaleDateString()}`, 14, 35);
          doc.text(`Generated by: ${profile.full_name || user.email}`, 14, 40);

          // Add employee data using autoTable directly
          autoTable(doc, {
            startY: 50,
            head: [['Name', 'Time In', 'Time Out']],
            body: editableWorkers.map(w => [w.name, w.timeIn || '--:--', w.timeOut || '--:--']),
            theme: 'grid',
            styles: {
              fontSize: 10,
              cellPadding: 5,
            },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontSize: 12,
              fontStyle: 'bold',
            },
          });

          // Add footer
          doc.setFontSize(8);
          doc.text('Generated by App Digital Assistant / Developed by Lemax Engineering LLC, USA.', 14, doc.internal.pageSize.getHeight() - 20);
          doc.text(new Date().toLocaleDateString(), 14, doc.internal.pageSize.getHeight() - 14);

          fileBlob = doc.output('blob');
        } else if (exportFormat === 'csv') {
          const csvContent = [
            'Attendance Record',
            '',
            `Company,${company.name}`,
            `Place,${documentData.place_name || documentData.place || company.name}`,
            `Date,${new Date(docDate).toLocaleDateString()}`,
            `Generated by,${profile.full_name || user.email}`,
            '',
            'Employee Attendance',
            'Name,Time In,Time Out',
            ...editableWorkers.map(w => `${w.name},${w.timeIn || '--:--'},${w.timeOut || '--:--'}`),
            '',
            'Generated Information',
            'Generated By,App Digital Assistant / App developed by Lemax Engineering LLC, USA',
            `Generated Date,${new Date().toLocaleDateString()}`
          ].join('\n');
          
          fileBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        } else if (exportFormat === 'xls') {
          // Create a new workbook
          const wb = XLSX.utils.book_new();
          
          // Create header info
          const headerInfo = [
            ['Attendance Record'],
            [''],
            [`Company: ${company.name}`],
            [`Place: ${documentData.place_name || documentData.place || company.name}`],
            [`Date: ${new Date(docDate).toLocaleDateString()}`],
            [`Generated by: ${profile.full_name || user.email}`],
            ['']
          ];

          // Convert data to worksheet
          const ws = XLSX.utils.json_to_sheet(editableWorkers.map(row => ({
            'Name': row.name,
            'Time In': row.timeIn || '--:--',
            'Time Out': row.timeOut || '--:--'
          })), { origin: 'A8' }); // Start data from row 8

          // Add header info
          XLSX.utils.sheet_add_aoa(ws, headerInfo, { origin: 'A1' });

          // Add footer
          const footerInfo = [
            [''],
            ['Generated Information'],
            ['Generated By: App Digital Assistant / App developed by Lemax Engineering LLC, USA'],
            [`Generated Date: ${new Date().toLocaleDateString()}`]
          ];
          XLSX.utils.sheet_add_aoa(ws, footerInfo, { origin: 'A' + (editableWorkers.length + 10) });

          // Style the worksheet
          ws['!cols'] = [
            { wch: 30 }, // Name column
            { wch: 15 }, // Time In column
            { wch: 15 }  // Time Out column
          ];

          // Add the worksheet to workbook
          XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

          // Generate Excel file as blob
          const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
          fileBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        }
      } catch (exportError) {
        // If file generation fails, clean up the database entries
        await supabase
          .from('documents_details')
          .delete()
          .eq('document_id', doc.id);
        await supabase
          .from('documents')
          .delete()
          .eq('id', doc.id);
        throw new Error(`Failed to generate ${exportFormat.toUpperCase()} file: ${exportError.message}`);
      }

      if (!fileBlob) {
        // If file generation fails, clean up the database entries
        await supabase
          .from('documents_details')
          .delete()
          .eq('document_id', doc.id);
        await supabase
          .from('documents')
          .delete()
          .eq('id', doc.id);
        throw new Error('Failed to generate file. Please try again.');
      }

      // 6. Update document with file information
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'completed'
        })
        .eq('id', doc.id);

      if (updateError) {
        console.error('Failed to update document status:', updateError);
        // Don't throw here as the document is already created
      }

      setGeneratedFile(fileBlob);
      setShowPreview(true);
    } catch (e) {
      setError(e.message || 'Failed to generate and send document.');
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  // Add a function to handle final send/save after preview
  const handleSendOrSave = async () => {
    if (!user) {
      setError('You must be logged in to send or save documents.');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      if (!saveLocal && email) {
        // Get user profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw new Error('Failed to fetch user profile. Please try again.');
        }

        // Send via email using Nodemailer
        await sendDocumentEmail({
          file: generatedFile,
          format: exportFormat,
          email,
          user: {
            name: profile?.full_name || user.user_metadata?.full_name || user.email,
            email: user.email
          },
          company: documentData.company_name,
          date: parsed?.date || documentData.document_date || documentData.date,
          workers: editableWorkers,
          place: documentData.place_name || documentData.place || documentData.company_name,
        });
        setSuccess(true);
        setShowPreview(false);
        return;
      }

      // Download the file locally
      if (generatedFile) {
        const url = URL.createObjectURL(generatedFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Attendance_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      setSuccess(true);
      setShowPreview(false);
    } catch (e) {
      setError(e.message || 'Failed to send or save document.');
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  // Loading overlay
  if (loading) {
    return (
      <View style={globalStyles.loadingOverlay}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={globalStyles.loadingText}>Processing scanned images...</Text>
      </View>
    );
  }
  // Error state
  if (error) {
    return (
      <ImageBackground source={require('../assets/images/splash01.png')} style={globalStyles.backgroundImage}>
        <View style={globalStyles.container}>
          <Text style={[globalStyles.errorText, { marginTop: 40, textAlign: 'center', fontWeight: 'bold', fontSize: 22 }]}>{error}</Text>
          <Button 
            mode="contained" 
            onPress={() => {
              if (error.includes('already exists')) {
                router.push('/document/new');
              } else if (error.includes('Failed to save employee records')) {
                router.push('/scanner');
              } else {
                router.push('/scanner');
              }
            }} 
            style={[globalStyles.button, { marginTop: 24 }]} 
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            buttonColor={colors.primary}
          >
            {error.includes('already exists') ? 'Return to New Document' : 'Return to Scanner'}
          </Button>
        </View>
      </ImageBackground>
    );
  }
  // Success state
  if (success) {
    return (
      <Portal>
        <Modal 
          visible={true} 
          onDismiss={() => setSuccess(false)} 
          contentContainerStyle={[
            globalStyles.modal,
            { 
              backgroundColor: '#fff',
              margin: 24,
              borderRadius: 12,
              padding: 24,
              alignItems: 'center'
            }
          ]}
        >
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <IconButton
              icon="check-circle"
              size={64}
              iconColor={colors.success}
              style={{ marginBottom: 16 }}
            />
            <Text style={[globalStyles.sectionTitle, { color: colors.primary, textAlign: 'center', marginBottom: 8 }]}>
              Document Generated Successfully!
            </Text>
            <Text style={[globalStyles.infoText, { textAlign: 'center', color: '#666' }]}>
              Your document has been saved and is ready for use.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
            <Button 
              mode="contained" 
              onPress={() => {
                setSuccess(false);
                router.push('/dashboard');
              }}
              style={[globalStyles.button, globalStyles.primaryButton]}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            >
            Return to Dashboard
          </Button>
          </View>
        </Modal>
      </Portal>
    );
  }
  // Main UI
  return (
    <ImageBackground source={require('../assets/images/splash01.png')} style={globalStyles.backgroundImage}>
      <ScrollView style={globalStyles.container}>
        {/* Logo at the top */}
        <View style={[globalStyles.logoContainer, { marginBottom: 8 }]}> 
          <Image source={require('../assets/images/logo.png')} style={globalStyles.logo} resizeMode="contain" />
        </View>
        {/* Unified Document Info + Export/Email Section */}
        <Card style={[globalStyles.formBox, { marginBottom: 16, marginTop: 0 }]}> 
          <Card.Content>
            <Text style={{
              color: colors.primary,
              fontWeight: 'bold',
              fontSize: 20,
              textAlign: 'center',
              marginBottom: 8
            }}>Document Information</Text>
            <Text style={globalStyles.infoText}>Company: <Text style={{ fontWeight: 'bold', color: '#000' }}>{documentData.company_name}</Text></Text>
            <Text style={globalStyles.infoText}>Date: <Text style={{ fontWeight: 'bold', color: '#000' }}>{parsed?.date || documentData.document_date || documentData.date || 'N/A'}</Text></Text>
            <Text style={globalStyles.infoText}>Place: <Text style={{ fontWeight: 'bold', color: '#000' }}>{documentData.place_name || documentData.place || 'N/A'}</Text></Text>
            {/* Export Format Selector, Save Local, and Email all together */}
            <View style={{ marginTop: 12 }}>
              {Platform.OS === 'web' ? (
                <>
                  <select
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 16,
                      border: `1px solid ${colors.primary}`,
                      background: '#fff',
                      color: colors.primary,
                      fontWeight: 'bold',
                      marginBottom: 8,
                    }}
                  >
                    {EXPORT_FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Checkbox
                      status={saveLocal ? 'checked' : 'unchecked'}
                      onPress={() => setSaveLocal(!saveLocal)}
                      color={colors.primary}
                    />
                    <Text style={{ color: '#000', marginLeft: 8 }}>Save locally</Text>
                  </View>
                  {!saveLocal && (
                    <TextInput
                      label="Recipient Email"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setEmailError(validateEmail(text) ? '' : 'Invalid email address');
                      }}
                      error={!!emailError}
                      style={{
                        backgroundColor: '#fff',
                        marginBottom: 8,
                      }}
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  )}
                  {emailError ? (
                    <HelperText type="error" visible={!!emailError}>
                      {emailError}
                    </HelperText>
                  ) : null}
                </>
              ) : (
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <Button
                      mode="contained"
                      onPress={() => setMenuVisible(true)}
                      style={[globalStyles.button, { marginBottom: 8 }]}
                    >
                      {EXPORT_FORMATS.find(f => f.value === exportFormat)?.label || 'Select Format'}
                    </Button>
                  }
                >
                  {EXPORT_FORMATS.map(f => (
                    <Menu.Item
                      key={f.value}
                      onPress={() => {
                        setExportFormat(f.value);
                        setMenuVisible(false);
                      }}
                      title={f.label}
                    />
                  ))}
                </Menu>
              )}
            </View>
          </Card.Content>
        </Card>
        {/* Employee Table */}
        <Card style={[globalStyles.formBox, { marginBottom: 16 }]}> 
          <Card.Content>
            <Text variant="titleMedium" style={[globalStyles.sectionTitle, { color: colors.primary }]}>Employee Records</Text>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title style={{ flex: 2 }}><Text style={{ color: '#000', fontWeight: 'bold' }}>Employee Name</Text></DataTable.Title>
                <DataTable.Title style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#000', fontWeight: 'bold', textAlign: 'center', width: '100%' }}>Times</Text>
                </DataTable.Title>
              </DataTable.Header>
              {editableWorkers.map((worker, idx) => (
                <DataTable.Row key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f5f7fa' : '#fff' }}>
                  <DataTable.Cell style={{ flex: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={colors.error}
                        onPress={() => handleDeleteWorker(idx)}
                        style={{ margin: 0, padding: 0, marginRight: 8 }}
                      />
                      <Text style={{ color: '#000', flex: 1, fontSize: 13 }}>{worker.name}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 2, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <TextInput
                        value={worker.timeIn || ''}
                        onChangeText={val => {
                          let filtered = filterTimeInput(val);
                          filtered = autoFormatToHHmm(filtered);
                          if (isValidTimeHHmm(filtered) || filtered.length < 5) {
                            handleWorkerTimeChange(idx, 'timeIn', filtered);
                          }
                        }}
                        style={{
                          backgroundColor: '#fff',
                          color: '#000',
                          width: 58,
                          minHeight: 36,
                          fontSize: 15,
                          textAlign: 'center',
                          borderRadius: 8,
                          marginRight: 4,
                          fontWeight: 'bold',
                          borderWidth: 1,
                          borderColor: '#bbb',
                        }}
                        mode="outlined"
                        dense
                        placeholder="--:--"
                        outlineColor={colors.primary}
                        activeOutlineColor={colors.primary}
                        placeholderTextColor="#000"
                        maxLength={5}
                        keyboardType="default"
                        accessibilityLabel={`Start time for ${worker.name}`}
                        returnKeyType="done"
                        theme={{ colors: { text: '#000', placeholder: '#000', disabled: '#000' } }}
                      />
                      <TextInput
                        value={worker.timeOut || ''}
                        onChangeText={val => {
                          let filtered = filterTimeInput(val);
                          filtered = autoFormatToHHmm(filtered);
                          if (isValidTimeHHmm(filtered) || filtered.length < 5) {
                            handleWorkerTimeChange(idx, 'timeOut', filtered);
                          }
                        }}
                        style={{
                          backgroundColor: '#fff',
                          color: '#000',
                          width: 58,
                          minHeight: 36,
                          fontSize: 15,
                          textAlign: 'center',
                          borderRadius: 8,
                          marginLeft: 4,
                          fontWeight: 'bold',
                          borderWidth: 1,
                          borderColor: '#bbb',
                        }}
                        mode="outlined"
                        dense
                        placeholder="--:--"
                        outlineColor={colors.primary}
                        activeOutlineColor={colors.primary}
                        placeholderTextColor="#000"
                        maxLength={5}
                        keyboardType="default"
                        accessibilityLabel={`End time for ${worker.name}`}
                        returnKeyType="done"
                        theme={{ colors: { text: '#000', placeholder: '#000', disabled: '#000' } }}
                      />
                    </View>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
              {/* Summary row */}
              <DataTable.Row style={{ backgroundColor: '#fff', alignItems: 'center' }}>
                <DataTable.Cell style={{ flex: 2, justifyContent: 'center' }}>
                  <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 16 }}>Total Employees</Text>
                </DataTable.Cell>
                <DataTable.Cell style={{ flex: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', color: '#000', fontSize: 16 }}>{editableWorkers.length}</Text>
                </DataTable.Cell>
              </DataTable.Row>
            </DataTable>
          </Card.Content>
        </Card>
        {/* Generate Button */}
        <View style={{ width: '100%', paddingHorizontal: 0, marginHorizontal: 0 }}>
      <Button
        mode="contained"
        onPress={handleGenerate}
            style={[
              globalStyles.button,
              globalStyles.primaryButton,
              loading && globalStyles.disabledButton,
              { width: '100%', minHeight: 48, marginBottom: 8 }
            ]}
            contentStyle={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
            labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center', width: '100%' }}
        loading={loading}
        disabled={loading}
      >
        Generate Document
      </Button>
      <Button
        mode="outlined"
        onPress={() => router.push('/scanner')}
            style={[
              globalStyles.button,
              globalStyles.outlinedButton,
              loading && globalStyles.disabledButton,
              { width: '100%', minHeight: 48 }
            ]}
            contentStyle={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
            labelStyle={{ color: colors.primary, fontWeight: 'bold', fontSize: 16, textAlign: 'center', width: '100%' }}
        disabled={loading}
      >
        Back
      </Button>
    </View>
        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={3000}
          action={{ label: 'OK', onPress: () => setShowSnackbar(false) }}
        >
          {error}
        </Snackbar>
      </ScrollView>
      <FilePreviewModal
        visible={showPreview}
        file={generatedFile}
        format={exportFormat}
        onClose={() => setShowPreview(false)}
        onConfirm={handleSendOrSave}
        data={editableWorkers}
      />
      {/* Delete Confirmation Dialog */}
      <Portal>
        <Modal
          visible={deleteDialogVisible}
          onDismiss={cancelDeleteWorker}
          contentContainerStyle={{
            backgroundColor: 'white',
            padding: 20,
            margin: 20,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: colors.error }}>
            Delete Worker Record
          </Text>
          <Text style={{ marginBottom: 8, fontWeight: 'bold', color: colors.error }}>
            Are you sure you want to delete this worker record?
          </Text>
          {workerToDelete !== null && editableWorkers[workerToDelete] && (
            <Text style={{ marginBottom: 16, fontWeight: 'bold', color: colors.error }}>
              {editableWorkers[workerToDelete].name || 'Unnamed worker'}
            </Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button
              onPress={cancelDeleteWorker}
              style={{ marginRight: 8, minWidth: 100 }}  // Add minimum width
              contentStyle={{ height: 40 }}  // Ensure consistent height
              mode="contained"
              buttonColor="#666"
              textColor="white"
            >
              Cancel
            </Button>
            <Button
              onPress={confirmDeleteWorker}
              style={{ minWidth: 100 }}  // Add minimum width
              contentStyle={{ height: 40 }}  // Ensure consistent height
              mode="contained"
              buttonColor={colors.error}
              textColor="white"
            >
              Delete
            </Button>
          </View>
        </Modal>
      </Portal>
      {/* Validation Modal */}
      <Portal>
        <Modal
          visible={validationModalVisible}
          onDismiss={() => setValidationModalVisible(false)}
          contentContainerStyle={{
            backgroundColor: 'white',
            padding: 20,
            margin: 20,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: colors.error }}>
            Validation Error
          </Text>
          <Text style={{ marginBottom: 16 }}>
            {validationMessage}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Button
              onPress={() => setValidationModalVisible(false)}
              style={{ minWidth: 100 }}  // Add minimum width
              contentStyle={{ height: 40 }}  // Ensure consistent height
              mode="contained"
              buttonColor={colors.primary}
              textColor="white"
            >
              OK
            </Button>
          </View>
        </Modal>
      </Portal>
    </ImageBackground>
  );
} 