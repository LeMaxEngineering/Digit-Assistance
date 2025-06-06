import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

  const GOOGLE_VISION_API_KEY = Constants.expoConfig?.extra?.googleVisionApiKey;

// Add debug logging
  useEffect(() => {
  console.log('API Key Configuration:', {
    hasKey: !!GOOGLE_VISION_API_KEY,
    keyLength: GOOGLE_VISION_API_KEY?.length,
    keyPreview: GOOGLE_VISION_API_KEY ? `${GOOGLE_VISION_API_KEY.substring(0, 5)}...` : 'none',
    config: Constants.expoConfig?.extra
  });
}, []);

async function convertImageToBase64(uri) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
}

async function ocrImageWithGoogleVision(base64, apiKey) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const body = JSON.stringify({
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION' }]
      }
    ]
  });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Vision API Error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return result.responses?.[0]?.fullTextAnnotation?.text || '';
  } catch (error) {
    console.error('Google Vision API Error:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

function standardizeTime(timeStr) {
  if (!timeStr) return null;
  
  // Remove any spaces
  timeStr = timeStr.trim();
  
  // Handle HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  
  // Handle HHMM format
  if (/^\d{3,4}$/.test(timeStr)) {
    const padded = timeStr.padStart(4, '0');
    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
  }
  
  return null;
}

function isValidTime(timeStr) {
  if (!timeStr) return false;
  
  const standardized = standardizeTime(timeStr);
  if (!standardized) return false;
  
  const [hours, minutes] = standardized.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function filterScannedText(text) {
  try {
    // Debug log the full text
    console.log('Full scanned text:', text);

    // Extract date from SIGN IN SHEET header with more flexible pattern
    const datePatterns = [
      /SIGN\s*IN\s*SHEET\s*:\s*([A-Za-z]+),\s*(\d{2}\/\d{2}\/\d{4})/i,
      /SIGN\s*IN\s*SHEET\s*:\s*(\d{2}\/\d{2}\/\d{4})/i,
      /SIGN\s*IN\s*SHEET\s*:\s*([A-Za-z]+)\s*(\d{2}\/\d{2}\/\d{4})/i
    ];

    let documentDate = null;
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        documentDate = match[match.length - 1]; // Get the last capture group which should be the date
        console.log('Date found:', documentDate, 'using pattern:', pattern);
        break;
      }
    }

    if (!documentDate) {
      console.log('No date found in text. Tried patterns:', datePatterns);
    }

    // Case-insensitive, flexible marker detection
    const namesMatch = /NAMES?:?/i.exec(text) || /NAME:?/i.exec(text);
    const pageMatch = /PAGE/i.exec(text);
    const namesIndex = namesMatch ? namesMatch.index : -1;
    const pageIndex = pageMatch ? pageMatch.index : -1;

    // If markers aren't found, return the raw text for debugging
    if (namesIndex === -1 || pageIndex === -1) {
      console.log('Raw scanned text:', text);
      return {
        date: documentDate,
        text: text,
        error: 'Could not find required markers (NAMES or Page). Showing raw text for debugging.',
        structured: [],
        records: []
      };
    }

    // Extract the relevant section
    const relevantSection = text.substring(namesIndex, pageIndex);

    // Split into lines and filter out empty lines
    const lines = relevantSection
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Remove header lines (NAMES, TIME IN, TIME OUT)
    const filteredLines = lines.filter(line => 
      !/NAMES?/i.test(line) && 
      !/TIME IN/i.test(line) && 
      !/TIME OUT/i.test(line)
    );

    // Classify each line as a name or time
    const structured = filteredLines.map(line => {
      // Skip lines that start with numbers (unless they're valid times)
      if (/^\d/.test(line)) {
        // Only keep if it's a valid time format
        if (/^\d{1,2}:\d{2}$/.test(line) || /^\d{3,4}$/.test(line)) {
          return { type: 'time', value: line };
        }
        return null; // Skip this line
      }
      // Otherwise, treat as name
      return { type: 'name', value: line };
    }).filter(item => item !== null); // Remove skipped lines

    // Group names and times into records
    const records = [];
    let currentRecord = null;
    for (const item of structured) {
      if (item.type === 'name') {
        if (currentRecord) {
          records.push(currentRecord);
        }
        currentRecord = { 
          name: item.value, 
          timeIn: null, 
          timeOut: null,
          originalTimeIn: null,
          originalTimeOut: null
        };
      } else if (item.type === 'time' && currentRecord) {
        // If we don't have a time in yet, this is time in
        if (!currentRecord.timeIn) {
          currentRecord.originalTimeIn = item.value;
          currentRecord.timeIn = standardizeTime(item.value);
        } else {
          // Otherwise, this is time out
          currentRecord.originalTimeOut = item.value;
          currentRecord.timeOut = standardizeTime(item.value);
        }
      }
    }
    if (currentRecord) {
      records.push(currentRecord);
    }

    // Validate times and check for completeness
    records.forEach(record => {
      const hasValidTimeIn = isValidTime(record.originalTimeIn);
      const hasValidTimeOut = isValidTime(record.originalTimeOut);
      record.isValid = hasValidTimeIn && hasValidTimeOut;
      record.isComplete = record.timeIn && record.timeOut;
    });

    // For debugging, log the records
    console.log('Records:', records);

    return {
      date: documentDate,
      text: filteredLines.join('\n'),
      error: null,
      structured,
      records
    };
  } catch (error) {
    console.error('Error filtering text:', error);
    return {
      date: null,
      text: text,
      error: `Error processing text: ${error.message}`,
      structured: [],
      records: []
    };
  }
}

function generateCSV(records, date) {
  const headers = ['Date', 'Name', 'Time In', 'Time Out'];
  const rows = records.map(record => [
    date || '',
    record.name,
    record.timeIn || '--',
    record.timeOut || '--'
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

export default function SimpleScanner() {
  const [scannedSheets, setScannedSheets] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        await handleScan(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        await handleScan(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const handleScan = async (uri) => {
    if (!GOOGLE_VISION_API_KEY || GOOGLE_VISION_API_KEY === 'YOUR_API_KEY_HERE') {
      Alert.alert('API Key Missing', 'Google Vision API key is not configured.');
      return;
    }

    setLoading(true);
    try {
      const base64 = await convertImageToBase64(uri);
      const rawText = await ocrImageWithGoogleVision(base64, GOOGLE_VISION_API_KEY);
      
      if (!rawText) {
        throw new Error('No text was detected in the image');
      }

      const filteredData = filterScannedText(rawText);
      setScannedSheets(prevSheets => [...prevSheets, filteredData]);
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (scannedSheets.length === 0) {
      Alert.alert('No Data', 'No sheets to export.');
      return;
    }

    // Combine all records from all sheets
    const allRecords = scannedSheets.flatMap(sheet => 
      sheet.records.map(record => ({
        ...record,
        date: sheet.date
      }))
    );

    const csv = generateCSV(allRecords);
    const filename = `sign_in_sheets_${new Date().toISOString().split('T')[0]}.csv`;

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      const fileUri = FileSystem.documentDirectory + filename;
      FileSystem.writeAsStringAsync(fileUri, csv)
        .then(() => {
          Alert.alert('Success', `File saved as ${filename}`);
        })
        .catch(error => {
          Alert.alert('Error', 'Failed to save file: ' + error.message);
        });
    }
  };

  const clearSheets = () => {
    setScannedSheets([]);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>Simple Sheet Scanner</Text>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <Button icon="camera" mode="outlined" onPress={takePhoto} style={{ marginRight: 8 }}>Take Photo</Button>
        <Button icon="image" mode="outlined" onPress={pickImage}>Pick Image</Button>
      </View>
      
      {loading && <ActivityIndicator size="large" style={{ marginVertical: 16 }} />}
      
      {scannedSheets.length > 0 && (
        <View style={{ marginTop: 16, width: '100%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text variant="titleMedium">Scanned Sheets ({scannedSheets.length})</Text>
            <View style={{ flexDirection: 'row' }}>
              <Button 
                icon="delete" 
                mode="outlined" 
                onPress={clearSheets}
                style={{ marginRight: 8 }}
              >
                Clear All
              </Button>
              <Button 
                icon="download" 
                mode="contained" 
                onPress={handleExport}
              >
                Export CSV
              </Button>
            </View>
          </View>
          <View style={{ backgroundColor: '#eef2f7', borderRadius: 8, padding: 8 }}>
            {/* Table Header */}
            <View style={{ 
              flexDirection: 'row', 
              borderBottomWidth: 1, 
              borderBottomColor: '#ccc',
              paddingBottom: 8,
              marginBottom: 8
            }}>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>NAME</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>TIME IN</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>TIME OUT</Text>
            </View>
            {/* Table Content */}
            <ScrollView style={{ maxHeight: 300 }}>
              {scannedSheets.flatMap((sheet, sheetIndex) => 
                sheet.records.map((record, idx) => (
                  <View key={`${sheetIndex}-${idx}`} style={{ 
                    flexDirection: 'row',
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: '#eee',
                    backgroundColor: sheetIndex % 2 === 0 ? '#eef2f7' : '#f5f7fa'
                  }}>
                    <Text style={{ 
                      flex: 2,
                      color: record.isValid ? '#222' : 'red'
                    }}>
                      {record.name}
                    </Text>
                    <Text style={{ 
                      flex: 1,
                      textAlign: 'center',
                      color: record.isValid ? '#222' : 'red'
                    }}>
                      {record.timeIn || '--'}
                    </Text>
                    <Text style={{ 
                      flex: 1,
                      textAlign: 'center',
                      color: record.isValid ? '#222' : 'red'
                    }}>
                      {record.timeOut || '--'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
} 