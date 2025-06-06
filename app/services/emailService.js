import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import emailjs from '@emailjs/browser';
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// EmailJS configuration
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || Constants.expoConfig?.extra?.EMAILJS_PUBLIC_KEY;
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || Constants.expoConfig?.extra?.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || Constants.expoConfig?.extra?.EMAILJS_TEMPLATE_ID;

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Gmail API configuration
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || Constants.expoConfig?.extra?.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || Constants.expoConfig?.extra?.GMAIL_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || Constants.expoConfig?.extra?.GMAIL_REDIRECT_URI;

// Initialize Google Sign-In for native platforms
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: GMAIL_CLIENT_ID,
    offlineAccess: true,
    scopes: ['https://www.googleapis.com/auth/gmail.send']
  });
}

// Get access token based on platform
const getAccessToken = async () => {
  if (Platform.OS === 'web') {
    // For web platform, use Google Identity Services
    return new Promise((resolve, reject) => {
      if (!window.google) {
        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.google.accounts.oauth2.initTokenClient({
            client_id: GMAIL_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/gmail.send',
            callback: (response) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response.access_token);
              }
            },
          }).requestAccessToken();
        };
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      } else {
        // Script already loaded, request token
        window.google.accounts.oauth2.initTokenClient({
          client_id: GMAIL_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/gmail.send',
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.access_token);
            }
          },
        }).requestAccessToken();
      }
    });
  } else {
    try {
      // For native platforms, use GoogleSignin
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { accessToken } = await GoogleSignin.getTokens();
      return accessToken;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }
};

// Create email message in base64 format
const createEmailMessage = (to, subject, text) => {
  const email = [
    'Content-Type: text/plain; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    `To: ${to}\n`,
    `Subject: ${subject}\n\n`,
    text
  ].join('');

  // Use TextEncoder for web platform
  if (Platform.OS === 'web') {
    const encoder = new TextEncoder();
    const data = encoder.encode(email);
    return btoa(String.fromCharCode.apply(null, data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Use Buffer for native platforms
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Send email with attachment
export const sendEmail = async ({ to, subject, text, user, company, place, date, workers }) => {
  try {
    console.log('Starting email send process...');
    
    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error('Invalid email address:', to);
      throw new Error('Invalid email address');
    }

    // Prepare email content
    const templateParams = {
      to_email: to,
      subject: subject,
      message: text,
      user_name: user?.name || 'User',
      company_name: company,
      place: place || company,
      date: date,
      workers_count: workers ? workers.length : 'N/A'
    };

    console.log('Preparing to send email with content:', templateParams);

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    
    return {
      success: true,
      message: 'Email sent successfully!',
      details: {
        to,
        subject,
        messageId: response.text
      }
    };

  } catch (error) {
    console.error('Detailed error in sendEmail:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send document email
export const sendDocumentEmail = async ({ file, format, email, user, company, date, workers, place }) => {
  if (!email || !user || !company) {
    throw new Error('Missing required email parameters');
  }

  try {
    // Create ASCII table for workers data
    const createAsciiTable = (workers) => {
      if (!workers || !workers.length) return 'No worker data available';
      
      const headers = ['Name', 'Time In', 'Time Out'];
      const rows = workers.map(w => [
        w.name || 'N/A',
        w.timeIn || '--:--',
        w.timeOut || '--:--'
      ]);
      
      // Calculate column widths
      const colWidths = headers.map((h, i) => {
        const maxContentLength = Math.max(
          h.length,
          ...rows.map(r => (r[i] || '').length)
        );
        return maxContentLength + 2;
      });
      
      // Create header row
      const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
      const separator = colWidths.map(w => '-'.repeat(w)).join('-+-');
      
      // Create data rows
      const dataRows = rows.map(row => 
        row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ')
      );
      
      return [
        headerRow,
        separator,
        ...dataRows
      ].join('\n');
    };

    // Prepare email content
    const templateParams = {
      to_email: email,
      subject: `Attendance Record - ${company} - ${date}`,
      message: `
Hello,

Please find below the attendance record with the following details:

Document Information:
- Company: ${company}
- Place: ${place || company}
- Date: ${date}
- Generated by: ${user?.name || 'User'}
- Total Workers: ${workers ? workers.length : 'N/A'}

Worker Information:
${createAsciiTable(workers)}

Best regards,
Digital Assistant`,
      user_name: user?.name || 'User',
      company_name: company,
      place: place || company,
      date: date,
      workers_count: workers ? workers.length : 'N/A'
    };

    console.log('Preparing to send document email:', {
      to: email,
      format,
      workers_count: workers?.length
    });

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    return {
      success: true,
      message: 'Document email sent successfully!',
      details: {
        to: email,
        format,
        messageId: response.text
      }
    };

  } catch (error) {
    throw new Error(`Failed to send document email: ${error.message}`);
  }
}; 