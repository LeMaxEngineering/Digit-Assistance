import React, { useState, useContext, useEffect } from 'react';
import { View, ScrollView, Image, Alert, ImageBackground, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import globalStyles from './styles/globalStyles';
import { DocumentContext } from './contexts/DocumentContext';
import { ocrImagesWithGoogleVision } from './utils/visionApi';
import Constants from 'expo-constants';
import colors from './styles/colors';

export default function Scanner() {
  const router = useRouter();
  const { documentData, setDocumentData } = useContext(DocumentContext);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [showMessage, setShowMessage] = useState(false);

  const GOOGLE_VISION_API_KEY = Constants.expoConfig?.extra?.googleVisionApiKey;

  useEffect(() => {
    if (!documentData?.code) {
      router.replace('/dashboard');
    }
  }, [documentData, router]);

  useEffect(() => {
    if (!documentData?.company_id || !documentData?.place_id) {
      Alert.alert(
        'Missing Information',
        'Please select a company and place before scanning.',
        [{ text: 'OK', onPress: () => router.replace('/document/new') }]
      );
    }
  }, [documentData]);

  useEffect(() => {
    if (documentData?.records && documentData.records.length > 0) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [documentData?.records]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        aspect: [3, 4],
        quality: 1,
      });

      if (!result.canceled) {
        const newImages = [...images, ...result.assets.map(asset => asset.uri)];
        setImages(newImages);
        setDocumentData(prev => ({
          ...prev,
          images: newImages
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 1,
      });

      if (!result.canceled) {
        const newImages = [...images, result.assets[0].uri];
        setImages(newImages);
        setDocumentData(prev => ({
          ...prev,
          images: newImages
        }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setDocumentData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const convertImageToBase64 = async (uri) => {
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting image on web:', error);
        throw error;
      }
    } else {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      } catch (error) {
        console.error('Error converting image on native:', error);
        throw error;
      }
    }
  };

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

      let relevantSection = '';
      if (namesIndex !== -1 && pageIndex !== -1) {
        // Both markers found: extract between them
        relevantSection = text.substring(namesIndex, pageIndex);
      } else if (namesIndex !== -1) {
        // Only NAMES found: extract from NAMES to end
        relevantSection = text.substring(namesIndex);
      } else {
        // NAMES not found: fallback to raw text
        console.log('Raw scanned text:', text);
        return {
          date: documentDate,
          text: text,
          error: 'Could not find required marker (NAMES). Showing raw text for debugging.',
          structured: [],
          records: []
        };
      }

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
        
        // Check if the line contains any numbers - if it does, it's probably an OCR error
        if (/\d/.test(line)) {
          console.log('Skipping line with numbers (likely OCR error):', line);
          return null;
        }
        
        // Only accept lines that contain only letters and spaces
        if (/^[A-Za-z\s]+$/.test(line)) {
          return { type: 'name', value: line };
        }
        
        console.log('Skipping invalid line:', line);
        return null;
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

  const handleProcess = async () => {
    if (images.length === 0) {
      Alert.alert('Error', 'You must add at least one image');
      return;
    }

    if (!GOOGLE_VISION_API_KEY || GOOGLE_VISION_API_KEY === "YOUR_API_KEY_HERE") {
      Alert.alert(
        'API Key Missing',
        'The Google Vision API key is not configured. Please set up your API key in the environment variables.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
      return;
    }

    setLoading(true);
    setProcessingStatus('Starting image processing...');

    try {
      // 1. Convert images to base64
      const base64Images = [];
      for (let i = 0; i < images.length; i++) {
        setProcessingStatus(`Converting image ${i + 1} of ${images.length}...`);
        try {
          const base64 = await convertImageToBase64(images[i]);
          base64Images.push(base64);
          console.log(`Successfully converted image ${i + 1}`);
        } catch (error) {
          console.error(`Error converting image ${i + 1}:`, error);
          throw new Error(`Failed to process image ${i + 1}`);
        }
      }

      setProcessingStatus('Sending images to Google Vision API...');

      // 2. Process each image individually with Google Vision API
      const ocrResults = [];
      for (let i = 0; i < base64Images.length; i++) {
        setProcessingStatus(`Processing page ${i + 1} of ${base64Images.length}...`);
        try {
          const result = await ocrImagesWithGoogleVision([base64Images[i]], GOOGLE_VISION_API_KEY);
          if (result && result[0]) {
            ocrResults.push(result[0]);
            console.log(`Successfully processed page ${i + 1}`);
          } else {
            console.warn(`No text detected in page ${i + 1}`);
            ocrResults.push({ fullTextAnnotation: { text: '' } });
          }
        } catch (error) {
          console.error(`Error processing page ${i + 1}:`, error);
          throw new Error(`Failed to process page ${i + 1}`);
        }
      }

      if (ocrResults.length === 0) {
        Alert.alert('Error', 'No text was detected in any of the images. Please try again with clearer images.');
        setLoading(false);
        setProcessingStatus('');
        return;
      }

      setProcessingStatus('Processing OCR results...');

      // 3. Process each OCR result with the new filtering
      const processedResults = ocrResults.map(result => {
        const text = result?.fullTextAnnotation?.text || '';
        return filterScannedText(text);
      });

      // 4. Combine all records
      const allRecords = processedResults.flatMap(result => result.records);
      const dates = processedResults.map(result => result.date).filter(Boolean);
      const scannedDate = dates[0]; // Use the first valid date found

      // 5. Update document data with processed results
      const updatedDocumentData = {
        ...documentData,
        ocrText: processedResults.map(r => r.text).join('\n\n'),
        status: 'processed',
        scanned_date: scannedDate,
        document_date: scannedDate,
        images: images,
        records: allRecords
      };

      console.log('Scanner - Records before navigation:', {
        recordCount: allRecords.length,
        firstRecord: allRecords[0],
        lastRecord: allRecords[allRecords.length - 1],
        allRecords: allRecords
      });

      console.log('Updating document data:', {
        code: updatedDocumentData.code,
        company: updatedDocumentData.company_name,
        date: updatedDocumentData.document_date,
        status: updatedDocumentData.status,
        hasOcrText: !!updatedDocumentData.ocrText,
        ocrTextLength: updatedDocumentData.ocrText?.length || 0,
        imageCount: updatedDocumentData.images?.length,
        recordCount: updatedDocumentData.records?.length
      });

      console.log('Navigating to /document/process with data:', updatedDocumentData);
      setDocumentData(updatedDocumentData);
        setLoading(false);
        setProcessingStatus('');
      router.push('/document/process');
    } catch (error) {
      console.error('Error processing images:', error);
      setLoading(false);
      setProcessingStatus('');
      Alert.alert('Error', error.message || 'Failed to process images. Please try again.');
    }
  };

  return (
    <ImageBackground source={require('./assets/images/splash01.png')} style={globalStyles.backgroundImage}>
      {loading && (
        <View style={globalStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={globalStyles.errorText}>{processingStatus || 'Processing images...'}</Text>
        </View>
      )}
      {showMessage && (
        <View style={[globalStyles.messageOverlay, { backgroundColor: 'rgba(255, 193, 7, 0.9)' }]}>
          <Text style={[globalStyles.messageText, { color: '#000' }]}>
            Please review and correct the time entries. End times must be after start times.
          </Text>
        </View>
      )}
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={globalStyles.logoContainer}>
          <Image source={require('./assets/images/logo.png')} style={globalStyles.logo} resizeMode="contain" />
        </View>
        <View style={[globalStyles.content, globalStyles.formBox]}>
          <View style={globalStyles.infoContainer}>
            <Text style={globalStyles.infoTitle}>Document Info</Text>
            <Text style={globalStyles.infoText}>Code: {documentData.code}</Text>
            <Text style={globalStyles.infoText}>Company: {documentData.company_name}</Text>
            <Text style={globalStyles.infoText}>Place: {documentData.place_name}</Text>
          </View>
          <Text variant="headlineMedium" style={globalStyles.title}>
            Scan Document
          </Text>
          <View style={[globalStyles.buttonRow, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 12 }]}>
            {Platform.OS !== 'web' && (
              <Button 
                icon="camera" 
                mode="outlined" 
                onPress={takePhoto} 
                style={globalStyles.button}
                disabled={loading}
                textColor="#1976D2"
                borderColor="#1976D2"
              >
                Take Photo
              </Button>
            )}
            <Button 
              icon="image" 
              mode="outlined" 
              onPress={pickImage} 
              style={globalStyles.button}
              disabled={loading}
              textColor="#1976D2"
              borderColor="#1976D2"
            >
              Pick Image
            </Button>
          </View>
          <ScrollView horizontal style={globalStyles.imageGrid}>
            {images.map((image, index) => (
              <View key={index} style={globalStyles.imageCard}>
                <Image source={{ uri: image }} style={globalStyles.image} />
                <View style={globalStyles.imageOverlay}>
                  <Text style={globalStyles.imageNumber}>Page {index + 1}</Text>
                </View>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => handleRemoveImage(index)}
                  style={globalStyles.removeButton}
                  disabled={loading}
                />
              </View>
            ))}
          </ScrollView>
          <Button
            mode="contained"
            onPress={handleProcess}
            style={[globalStyles.button, globalStyles.primaryButton]}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            disabled={loading || images.length === 0}
          >
            Process Images
          </Button>
          <TouchableOpacity style={globalStyles.loginLink} onPress={() => router.back()} disabled={loading}>
            <Text style={globalStyles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
} 