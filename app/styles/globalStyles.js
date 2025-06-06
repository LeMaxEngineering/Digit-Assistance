import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const globalStyles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#1976D2',
    fontWeight: 'bold',
    fontSize: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(25, 118, 210, 0.08)',
    minWidth: 100,
    minHeight: 48,
    width: '100%',
  },
  buttonContent: {
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#1976D2',
  },
  outlinedButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  errorText: {
    color: '#B00020',
    marginBottom: 16,
    fontSize: 14,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#666',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 24,
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  formBox: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 29,
    marginTop: 0,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
    borderBottomWidth: 4,
    borderBottomColor: 'red',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 20,
    color: '#1976D2',
    fontSize: 20,
    fontWeight: '600',
  },
  calendarContainer: {
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    marginTop: 10,
  },
  splashBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  splashHeader: {
    width: '100%',
    alignItems: 'center',
    marginTop: 60,
  },
  splashLogo: {
    width: 160,
    height: 160,
    marginBottom: 8,
  },
  splashWelcome: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  splashCenterContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
  },
  splashHeadline: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 24,
    textShadow: '1px 1px 4px rgba(0,0,0,0.7)',
  },
  splashButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 48,
  },
  splashLoginButton: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 32,
    marginHorizontal: 8,
  },
  splashLoginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  splashSignupButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 32,
    marginHorizontal: 8,
  },
  splashSignupButtonText: {
    color: '#222',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  imageGrid: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  imageCard: {
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  processButton: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#1976D2',
  },
  snackbar: {
    backgroundColor: '#333',
    borderRadius: 8,
  },
});

export default globalStyles; 