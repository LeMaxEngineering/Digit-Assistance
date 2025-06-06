import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, HelperText, RadioButton, Card } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../config/supabase';
import { exportToXLS, exportToCSV, exportToPDF, uploadFileToSupabase, sendExportEmail } from '../utils/export';
import globalStyles from '../styles/globalStyles';

export default function DocumentEdit() {
  const [document, setDocument] = useState(null);
  const [rows, setRows] = useState([]);
  const [type, setType] = useState('');
  const [emails, setEmails] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { documentId } = useLocalSearchParams();

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      setDocument(data);

      // Extract employee data from OCR results
      const employeeData = data.ocr_results?.flatMap(result => result.employeeData) || [];
      setRows(employeeData);
    } catch (error) {
      console.error('Error loading document:', error);
      Alert.alert('Error', 'Could not load the document');
      router.back();
    }
  };

  const handleChange = (idx, field, value) => {
    const updated = [...rows];
    updated[idx] = {
      ...updated[idx],
      [field]: value,
      error: false
    };

    // Validate time format (hh:mm)
    if (field === 'entry' || field === 'exit') {
      updated[idx].error = !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
    }

    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { name: '', entry: '', exit: '', error: false }]);
  };

  const removeRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const validate = () => {
    if (!type) return 'Please select a document type';
    
    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0 || !emailList.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) {
      return 'Please enter at least one valid email';
    }

    if (rows.some(r => r.error || !r.name || !r.entry || !r.exit)) {
      return 'Please fix errors in the table';
    }

    return '';
  };

  const handleSend = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    try {
      // Generate filename based on document code and date
      const filename = `record_${document.code}_${new Date().toISOString().split('T')[0]}`;
      let blob, fileUrl;

      // Export file and create Blob for upload
      if (type === 'csv') {
        // CSV export
        const headers = ['Name', 'Entry Time', 'Exit Time'];
        const csvContent = [
          headers.join(','),
          ...rows.map(row => [
            `"${row.name}"`,
            `"${row.entry}"`,
            `"${row.exit}"`
          ].join(','))
        ].join('\n');
        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const path = `${filename}.csv`;
        fileUrl = await uploadFileToSupabase(blob, path);
      } else if (type === 'pdf') {
        // PDF export
        const { jsPDF } = require('jspdf');
        require('jspdf-autotable');
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Attendance Record', 14, 15);
        doc.setFontSize(10);
        doc.text(`Document: ${document.code}`, 14, 25);
        doc.text(`Date: ${new Date(document.date).toLocaleDateString()}`, 14, 30);
        doc.text(`Company: ${document.company_name}`, 14, 35);
        doc.autoTable({
          startY: 40,
          head: [['Name', 'Entry Time', 'Exit Time']],
          body: rows.map(row => [row.name, row.entry, row.exit]),
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 5 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 12, fontStyle: 'bold' },
        });
        const pdfBlob = doc.output('blob');
        blob = pdfBlob;
        const path = `${filename}.pdf`;
        fileUrl = await uploadFileToSupabase(blob, path);
      } else {
        // XLSX: just export and download locally
        exportToXLS(rows, filename);
        Alert.alert('Exported', 'XLSX file generated locally.');
      }

      // Send email if CSV or PDF
      if ((type === 'csv' || type === 'pdf') && fileUrl) {
        await sendExportEmail({
          toEmails: emails.split(',').map(e => e.trim()),
          fileUrl,
          documentInfo: {
            code: document.code,
            date: document.date,
            company_name: document.company_name
          },
          exportType: type
        });
        Alert.alert('Success', 'Document exported and sent by email.');
      }

      // Update document with edited data
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'completed',
          export_type: type,
          recipient_emails: emails.split(',').map(e => e.trim()),
          employee_data: rows,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Navigate to history
      router.push('/document/history');
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Could not export or send the document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={globalStyles.container}>
      <View style={globalStyles.content}>
        <Text variant="headlineMedium" style={globalStyles.title}>
          Edit Document
        </Text>

        {document && (
          <Text style={globalStyles.infoText}>
            Document: {document.code}
          </Text>
        )}

        <Card style={globalStyles.formBox}>
          <Card.Title title="Employee Data" />
          <Card.Content>
            {rows.map((row, idx) => (
              <View key={idx} style={globalStyles.row}>
                <TextInput
                  label="Name"
                  value={row.name}
                  onChangeText={v => handleChange(idx, 'name', v)}
                  style={globalStyles.input}
                />
                <TextInput
                  label="Entry Time"
                  value={row.entry}
                  onChangeText={v => handleChange(idx, 'entry', v)}
                  style={globalStyles.input}
                  error={row.error}
                />
                <TextInput
                  label="Exit Time"
                  value={row.exit}
                  onChangeText={v => handleChange(idx, 'exit', v)}
                  style={globalStyles.input}
                  error={row.error}
                />
                <Button
                  mode="text"
                  onPress={() => removeRow(idx)}
                  style={globalStyles.removeButton}
                >
                  Remove
                </Button>
              </View>
            ))}
            <Button
              mode="outlined"
              onPress={addRow}
              style={globalStyles.addButton}
            >
              Add Employee
            </Button>
          </Card.Content>
        </Card>

        <Card style={globalStyles.formBox}>
          <Card.Title title="Export Options" />
          <Card.Content>
            <Text style={globalStyles.label}>Document Type</Text>
            <RadioButton.Group onValueChange={value => setType(value)} value={type}>
              <RadioButton.Item label="CSV" value="csv" />
              <RadioButton.Item label="PDF" value="pdf" />
              <RadioButton.Item label="XLSX" value="xlsx" />
            </RadioButton.Group>

            <TextInput
              label="Recipient Emails (comma-separated)"
              value={emails}
              onChangeText={setEmails}
              style={globalStyles.input}
            />
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          </Card.Content>
        </Card>

        <View style={globalStyles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSend}
            loading={loading}
            disabled={loading}
            style={globalStyles.button}
          >
            Save & Send
          </Button>
        </View>
      </View>
    </ScrollView>
  );
} 