import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Image, Platform } from 'react-native';
import { Text, Button, HelperText, TextInput, ActivityIndicator, Portal, Modal, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import globalStyles from '../styles/globalStyles';
import Input from '../components/common/Input';
import { useDocument } from '../contexts/DocumentContext';

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ASIST-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function DocumentForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { setDocumentData } = useDocument();
  const [companyId, setCompanyId] = useState('');
  const [otherCompany, setOtherCompany] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [placeId, setPlaceId] = useState('');
  const [showPlaceMenu, setShowPlaceMenu] = useState(false);

  useEffect(() => {
    setCode(generateCode());
  }, []);

  useEffect(() => {
    // Fetch companies from Supabase
    supabase
      .from('companies')
      .select('id, name')
      .then(({ data, error }) => {
        if (!error && data) setCompanies(data);
      });
  }, []);

  useEffect(() => {
    const fetchPlaces = async () => {
      if (!companyId) {
        console.log('No company selected, clearing places');
        setPlaces([]);
        setPlaceId('');
        return;
      }

      console.log('Fetching places for company:', companyId);
      try {
        const { data, error } = await supabase
          .from('places')
          .select('id, name')
          .eq('company_id', companyId);

        if (error) {
          console.error('Error fetching places:', error);
          if (error.code === 'PGRST301') {
            setError('You do not have permission to view places. Please contact your administrator.');
          }
          return;
        }

        console.log('Fetched places:', data);
        if (data && data.length > 0) {
          setPlaces(data);
          // Set the first place as selected if no place is currently selected
          if (!placeId) {
            console.log('Setting initial place:', data[0]);
            setPlaceId(data[0].id);
          }
        } else {
          console.log('No places found for company');
          setError('No places available for this company. Please contact your administrator to add places.');
          setPlaces([]);
          setPlaceId('');
        }
      } catch (error) {
        console.error('Error in fetchPlaces:', error);
        setError('Failed to load places. Please try again.');
        setPlaces([]);
        setPlaceId('');
      }
    };

    fetchPlaces();
  }, [companyId]);

  // Add a debug effect to monitor places state
  useEffect(() => {
    console.log('Current places state:', places);
    console.log('Current placeId:', placeId);
  }, [places, placeId]);

  const validate = () => {
    if (!companyId) return 'Please select a company';
    if (!placeId) return 'Please select a place';
    if (companyId === 'ANOTHER COMPANY' && !otherCompany.trim()) return 'Please enter the company name';
    return '';
  };

  const handleNext = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const selectedCompany = companies.find(c => c.id === companyId);
    
    setDocumentData({
      code,
      company_id: companyId === 'ANOTHER COMPANY' ? otherCompany : companyId,
      company_name: selectedCompany?.name || '',
      user_id: user.id,
      status: 'draft',
      place_id: placeId,
      place_name: places.find(p => p.id === placeId)?.name || '',
    });
    router.push('/scanner');
  };

  return (
    <ImageBackground source={require('../assets/images/splash01.png')} style={globalStyles.backgroundImage}>
      {loading && (
        <View style={globalStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      )}
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={globalStyles.logoContainer}>
          <Image source={require('../assets/images/logo.png')} style={globalStyles.logo} resizeMode="contain" />
        </View>
        <View style={[globalStyles.content, globalStyles.formBox]}>
          <Text variant="headlineMedium" style={globalStyles.title}>
            New Document
          </Text>
          <TextInput
            label="Code"
            value={code}
            disabled
            style={globalStyles.input}
          />
          {Platform.OS === 'web' ? (
            <select
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 16, border: '1px solid #ccc', background: '#f5f7fa', boxSizing: 'border-box', height: 48 }}
              disabled={loading}
            >
              <option value="" disabled>Select your company</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          ) : (
            <Menu
              visible={showCompanyMenu}
              onDismiss={() => setShowCompanyMenu(false)}
              anchor={
                <TouchableOpacity onPress={() => setShowCompanyMenu(true)} disabled={loading}>
                  <TextInput
                    label="Company"
                    value={companies.find(c => c.id === companyId)?.name || ''}
                    style={globalStyles.input}
                    editable={false}
                    error={!!error}
                    placeholder="Select your company"
                  />
                </TouchableOpacity>
              }
            >
              {companies.map(company => (
                <Menu.Item
                  key={company.id}
                  onPress={() => {
                    setCompanyId(company.id);
                    setShowCompanyMenu(false);
                  }}
                  title={company.name}
                />
              ))}
            </Menu>
          )}
          {companyId === 'ANOTHER COMPANY' && (
            <Input
              label="Other Company Name"
              value={otherCompany}
              onChangeText={setOtherCompany}
              error={!!error}
              placeholder="Enter the company name"
              disabled={loading}
            />
          )}
          {Platform.OS === 'web' ? (
            <select
              value={placeId || ''}
              onChange={e => {
                console.log('Selected place:', e.target.value);
                setPlaceId(e.target.value);
              }}
              style={{ width: '100%', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 16, border: '1px solid #ccc', background: '#f5f7fa', boxSizing: 'border-box', height: 48 }}
              disabled={loading || !places.length}
            >
              <option value="" disabled>Select place</option>
              {places && places.length > 0 ? (
                places.map(place => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>No places available</option>
              )}
            </select>
          ) : (
            <Menu
              visible={showPlaceMenu}
              onDismiss={() => setShowPlaceMenu(false)}
              anchor={
                <TouchableOpacity onPress={() => setShowPlaceMenu(true)} disabled={loading || !places.length}>
                  <TextInput
                    label="Place"
                    value={places.find(p => p.id === placeId)?.name || ''}
                    style={globalStyles.input}
                    editable={false}
                    error={!!error}
                    placeholder={places.length ? "Select place" : "No places available"}
                  />
                </TouchableOpacity>
              }
            >
              {places && places.map(place => (
                <Menu.Item
                  key={place.id}
                  onPress={() => {
                    setPlaceId(place.id);
                    setShowPlaceMenu(false);
                  }}
                  title={place.name}
                />
              ))}
            </Menu>
          )}
          {error ? (
            <Text style={globalStyles.errorText}>{error}</Text>
          ) : null}
          <Button
            mode="contained"
            onPress={handleNext}
            loading={loading}
            disabled={loading}
            style={[globalStyles.button, globalStyles.primaryButton]}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
          >
            Next
          </Button>
          <TouchableOpacity style={globalStyles.loginLink} onPress={() => router.back()} disabled={loading}>
            <Text style={globalStyles.linkText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={globalStyles.loginLink} onPress={() => router.push('/dashboard')}>
            <Text style={globalStyles.linkText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
} 