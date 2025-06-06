# App Construction Plan

This plan outlines the step-by-step process for building the Digital Assistance App. Each step should be completed and tested before moving to the next.

---

## 1. Project Setup ✅
- Initialize the project with Expo and React Native.
- Set up the folder structure as described in the documentation.
- Install all required dependencies (React Native, Expo, Supabase, react-native-paper, etc.).
- Set up version control (Git) and create a `.gitignore` file.

---

## 2. Supabase Configuration ✅
- Create a Supabase project in the Supabase Console.
- Set up the database schema for:
  - Users table (extends Supabase auth)
  - Documents table
  - Companies table
  - Places table
- Configure Row Level Security (RLS) policies
- Add Supabase credentials to environment variables
- Implement the Supabase client configuration (`app/config/supabase.js`)
- Test the connection by running the app and checking for errors.

---

## 3. Authentication Context ✅
- Create the authentication context (`app/contexts/AuthContext.jsx`).
- Implement login, registration, and logout methods using Supabase Auth.
- Provide user state and loading state to the app.
- Test authentication context with mock screens.

---

## 4. Splash Screen ✅
- Add the main logo image to `app/assets/images/logo.png`.
- Implement the splash screen component (`app/screens/Splash.jsx`).
- Set up navigation logic to redirect to login or dashboard based on authentication state.
- Test splash screen appearance and navigation.

---

## 5. Authentication Screens ✅
- Create reusable input components.
- Implement Login screen with email/password authentication.
- Implement Register screen with form validation.
- Set up navigation between login and register screens.
- Implement mandatory profile completion flow:
  - Create ProfileCompletionForm component
  - Add company selection functionality
  - Implement profile update logic
  - Add validation and error handling
- Test authentication flow end-to-end.

---

## 6. Dashboard Screen ✅
- Create the dashboard screen as the main menu after login.
- Display user info and navigation options (Nuevo Documento, Documentos Creados).
- Add avatar and logout button.
- Test dashboard navigation and user info display.

---

## 7. Document Creation (Form01) ✅
- Implement the document creation form with all required fields.
- Add company dropdown, auto-generated code, and date picker.
- Add navigation to the scanner interface.
- Validate form fields and enable/disable actions accordingly.
- Test form validation and navigation.

---

## 8. Document Scanning ✅
- Implement the scanner interface using Expo Camera or Image Picker.
- Allow multiple page scans and previews.
- Add logic to process images and return to the form.
- Handle unsaved data warnings.
- Test scanning, preview, and navigation.

---

## 9. Document Processing with OCR ✅
- Integrate **Google Vision API** for OCR processing of scanned images.
- Support multi-page document scanning: concatenate and parse all pages' OCR text.
- Implement robust document parsing with:
  - Multi-page date validation
  - Worker record extraction
  - Time format validation
  - Clear error messages
- Parse and structure extracted data for the next form using a robust parser that:
  - Handles page footers
  - Validates dates across all pages
  - Ensures consistent date format
  - Processes multi-sheet data
- Handle errors and show progress indicators.
- Test OCR accuracy and error handling.

---

## 10. Data Editing, Preview, and Export (Form02) ✅
- Display extracted data in an editable table (start/end time, name, etc.).
- Implement manual correction and error highlighting.
- Add export options (XLS, CSV, PDF) and email input.
- Validate export form and enable send button.
- Show a preview modal/component for the generated file before sending or saving.
- Test data editing, validation, preview, and export options.

---

## 11. Email Sending, Local Save, and Document Storage ✅
- Integrate EmailJS for sending documents via email.
- Allow users to save files locally (download on web, save to device on native).
- Store generated files in Supabase Storage and document metadata in the database.
- Show success/failure feedback to the user.
- Test email sending, local save, and document storage.

---

## 12. Document History ✅
- Implement the document history screen with a list of sent/created documents.
- Add company filtering functionality:
  - Platform-specific implementation (web/mobile)
  - Real-time filtering
  - Maintain document sorting
- Implement document sorting:
  - Primary sort by document date (newest to oldest)
  - Secondary sort by creation date
- Allow viewing document details in read-only mode.
- Add navigation back to the dashboard.
- Test document history and detail view.

---

## 13. UI/UX Enhancements ✅
- Add the simple logo to headers or as needed.
- Polish UI with consistent theming and responsive layouts.
- Add loading indicators, error messages, and confirmation dialogs.
- Test the app on different devices and screen sizes.

---

## 14. Testing and QA 🔄
- Write unit and integration tests for critical components and flows.
- Perform manual QA for all user stories and edge cases.
- Fix bugs and optimize performance.
- Test platform-specific features (web/mobile).

---

## 15. Deployment 🔄
- Prepare the app for production (optimize assets, update configs).
- Configure EAS build profiles for development, preview, and production.
- Deploy to app stores and/or web as needed.
- Monitor for issues and gather user feedback.

---

## 16. Database Schema Sync ✅
- Ensure all code matches the actual DB schema (see project_chat_log.md for latest structure).
- Update code and documentation if schema changes (e.g., column renames, removals).

---

## 17. Future Enhancements
- Add date range filtering to document history
- Implement search functionality
- Add more sorting options
- Consider pagination for large document lists
- Add export functionality for filtered results
- Implement place management features
- Add profile editing capabilities
- Consider adding more profile fields
- Add biometric authentication
- Implement proper session management

---

**End of Plan**
