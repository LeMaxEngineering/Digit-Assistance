# Project Chat Log

This file is used to record all important chats, decisions, and context for the Digital Assistance App project. Use this log to keep track of progress, requirements, and any agreements or clarifications made during development.

---

## Conversation Log (to this point)

### Project Progress & Decisions
- The project follows a step-by-step plan outlined in `development_plan.md`.
- Steps completed so far include project setup, Supabase configuration, authentication context, splash screen, authentication screens, dashboard, document creation, scanning, processing, editing/export, email sending/storage, and document history/detail screens.
- The UI/UX is being modernized to match bold, branded styles (inspired by Revolut/GoPay examples).
- The splash screen was redesigned to use a construction workers image as background, then updated to use a local image `splash01.png`.
- The logo is kept as is, and the splash screen now features a bold headline and two prominent buttons (Log in, Sign up).

### Technical Issues & Fixes
- Encountered missing dependency errors for `jspdf-autotable` during bundling. Solution: install the package with `npm install jspdf-autotable`.
- Confirmed the database structure is outlined in the plan (Users, Documents, Companies tables), but field-level details are not specified in the codebase.

### Project Organization
- Created this `project_chat_log.md` file to persistently log all important chats, decisions, and project context, as previous chat history was lost.

### Latest Supabase Database Structure (SQL Schema)

```sql
-- 1. Companies Table
CREATE TABLE companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 2. User Profiles (Extends Supabase Auth)
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    full_name text,
    company_id uuid REFERENCES companies(id),
    role text DEFAULT 'user', -- e.g. 'user', 'admin'
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 3. Documents Table
CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    company_id uuid REFERENCES companies(id),
    title text NOT NULL,
    code text, -- auto-generated code for the document
    status text DEFAULT 'draft', -- 'draft', 'processed', 'sent'
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 4. Pages Table (for scanned pages)
CREATE TABLE pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    page_number integer NOT NULL,
    ocr_text text, -- extracted OCR text
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 5. Document Data Table (for extracted/edited data)
CREATE TABLE document_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    field_name text NOT NULL,
    field_value text,
    is_corrected boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 6. Sent Documents / Exports Table
CREATE TABLE sent_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    export_type text, -- 'pdf', 'csv', 'xls', etc.
    recipient_email text,
    sent_at timestamp with time zone DEFAULT timezone('utc', now()),
    file_url text -- link to the exported file in storage
);

-- 7. Indexes for Performance (Optional)
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_pages_document_id ON pages(document_id);
CREATE INDEX idx_document_data_document_id ON document_data(document_id);
CREATE INDEX idx_sent_documents_document_id ON sent_documents(document_id);
```

---

### npm audit Results (Dependency Vulnerabilities)

- **Moderate vulnerabilities in `undici` (used by Firebase and related packages):**
  - These are inherited from Firebase dependencies.
  - Ran `npm audit fix`, but some issues remain because fixes are not yet available in the current versions.
  - **Action:** Keep Firebase and related packages up to date. Monitor for updates and upgrade when possible.

- **High severity vulnerability in `xlsx`:**
  - Known vulnerability with no fix currently available.
  - **Action:** Use with caution, limit use to trusted data, and monitor for updates or consider alternatives if possible.

- **Funding warnings:**
  - Informational only; no action required unless you wish to support open-source maintainers.

#### Summary Table

| Vulnerability | Package      | Fix Available? | Action                        |
|---------------|--------------|----------------|-------------------------------|
| Moderate      | undici       | Partial        | Wait for Firebase update      |
| High          | xlsx         | No             | Use with caution, monitor     |

**General advice:**
- Most vulnerabilities are in indirect dependencies. Monitor for updates and upgrade when possible.
- For production, consider using tools like Snyk or Dependabot for automated security alerts and updates.

---

### Latest Review (Login Screen Implementation)

#### Current Implementation Review
- Login screen (`app/screens/auth/Login.jsx`) has been implemented with:
  - Email/password authentication using Supabase
  - Google authentication integration
  - Navigation to Register screen
  - Loading states and error handling
  - Modern UI with logo and styling
  - Form validation for required fields
  - Error message display
  - Loading overlay during authentication
  - Responsive layout with proper spacing

#### Components and Features
1. **Authentication Methods**:
   - Email/password login
   - Google OAuth login
   - Both methods use Supabase authentication

2. **UI Elements**:
   - Logo display
   - Welcome headline
   - Email input field
   - Password input field
   - Sign In button
   - Continue with Google button
   - Register link
   - Loading overlay
   - Error message display

3. **State Management**:
   - Email and password state
   - Loading state
   - Error state
   - Form validation

4. **Navigation**:
   - Redirect to dashboard on successful login
   - Navigation to Register screen
   - Error handling for failed authentication

#### Next Steps
1. Review and potentially enhance form validation
2. Consider adding password recovery functionality
3. Implement proper error handling for specific authentication errors
4. Add proper TypeScript types if not already implemented
5. Consider adding biometric authentication option
6. Implement proper session management

### Latest Updates (Login Screen Enhancements)

#### Added Features
1. **Password Recovery**:
   - Added "Forgot Password?" functionality
   - Implemented password reset flow using Supabase
   - Added validation for email before sending reset instructions

2. **Improved Error Handling**:
   - Added Snackbar component for better error feedback
   - Enhanced error messages with specific details from Supabase
   - Added dismissible notifications for success/error states

3. **UI Improvements**:
   - Added "Forgot Password?" link between login buttons
   - Improved error message display
   - Added loading states for all authentication actions

#### Technical Changes
1. **New Dependencies**:
   - Added Snackbar from react-native-paper
   - Extended AuthContext with resetPassword method

2. **State Management**:
   - Added snackbar visibility state
   - Added snackbar message state
   - Enhanced error handling with specific error messages

3. **Code Organization**:
   - Added handleResetPassword function
   - Added showSnackbar utility function
   - Improved error handling in existing functions

#### Next Steps
1. Implement the Register screen with similar enhancements
2. Add biometric authentication option
3. Implement proper session management
4. Add proper TypeScript types
5. Add unit tests for authentication flows

### Register Screen Implementation

#### Features Implemented
1. **Form Fields**:
   - Full Name input
   - Email input with validation
   - Password and Confirm Password fields
   - Company selection dropdown
   - All fields with proper validation

2. **Company Integration**:
   - Fetches companies from Supabase
   - Displays companies in a dropdown
   - Associates user with selected company

3. **Validation**:
   - Email format validation
   - Password length check (minimum 6 characters)
   - Password matching validation
   - Required field validation
   - Company selection validation

4. **UI/UX**:
   - Consistent styling with Login screen
   - Loading states
   - Error messages
   - Snackbar notifications
   - Scrollable form
   - Navigation back to Login

5. **Error Handling**:
   - Form validation errors
   - API errors
   - Company loading errors
   - Registration errors

#### Technical Implementation
1. **State Management**:
   - Individual state for each form field
   - Loading state
   - Error state
   - Snackbar state
   - Companies list state

2. **Data Flow**:
   - Fetches companies on component mount
   - Validates form before submission
   - Handles registration through AuthContext
   - Redirects to Login on success

3. **Security**:
   - Password confirmation
   - Email verification required
   - Secure password handling
   - Company association

#### Next Steps
1. Add biometric authentication
2. Implement proper session management
3. Add TypeScript types
4. Add unit tests
5. Implement email verification flow
6. Add password strength indicator

### Latest Fixes (Console Errors and Warnings)

#### Fixed Issues
1. **Missing Default Exports**:
   - Added default export to `supabase.js`
   - Added default export to `AuthContext.jsx`
   - Fixed export structure in authentication context

2. **Route Navigation**:
   - Updated navigation paths to match correct route structure
   - Fixed path from `/auth/Register` to `/screens/auth/Register`
   - Ensured consistency with Expo Router requirements

3. **Deprecated Props**:
   - Updated Image component to use proper resizeMode prop
   - Fixed style prop usage
   - Improved component structure

#### Technical Updates
1. **File Structure**:
   - Ensured proper exports in utility files
   - Fixed route naming conventions
   - Improved component organization

2. **Code Quality**:
   - Removed deprecated style props
   - Improved prop usage
   - Enhanced code readability

#### Next Steps
1. Address remaining console warnings
2. Implement proper error boundaries
3. Add loading states for route transitions
4. Improve error handling
5. Add proper TypeScript types

---

### Latest Refactor: Centralized Styles & Unified Auth Screens (June 2024)

#### Centralized Global Styles
- Created `app/styles/globalStyles.js` to hold all shared style definitions (container, button, logo, title, etc.).
- Updated Login and Register screens to import and use these shared styles, improving maintainability and scalability.

#### Unified Login & Register UI
- Refactored both Login (`app/auth/login.jsx`) and Register (`app/auth/register.jsx`) screens to use the same layout, components, and style structure.
- Both screens now use the same custom `Input` component, logo placement, button styles, and error handling.
- Navigation and validation logic is consistent across both screens.

#### Logo Size Update
- Doubled the logo size on both Login and Register screens for improved branding and visual impact.

#### Benefits
- Easier to maintain and update the app's look and feel from a single location.
- Consistent user experience across authentication screens.
- Improved scalability for future features and screens.

#### Next Steps
- Continue migrating other screens to use centralized styles.
- Consider extracting more shared UI components as the app grows.
- Keep `project_chat_log.md` updated with all major refactors and decisions.

---

### UI/UX Refactor: Unified Global Styles Across All Screens (June 2024)

- All main screens (Login, Register, Dashboard, New Document, Document History) now use:
  - The same background image (`splash01.png`) via globalStyles.backgroundImage
  - The same container and layout via globalStyles.container
  - A semi-transparent white form box (globalStyles.formBox) for main content
  - Shared logo, button, and error styles from globalStyles.js
- Removed page-specific duplicate styles in favor of global styles
- Ensured all forms, cards, and main content are visually consistent and modern
- Next: Continue updating remaining screens (scanner, edit, process, historyDetail, etc.) for full app-wide consistency

---

### Expo Go Error: Node.js Standard Library Module Not Supported (June 2024)

- **Issue:**
  - Error: The package at "node_modules\ws\lib\websocket-server.js" attempted to import the Node standard library module "events". It failed because the native React runtime does not include the Node standard library.
  - This error appears when running the app in Expo Go.
- **Cause:**
  - A dependency (direct or indirect) is trying to use Node.js-only modules (`ws`, `events`, etc.), which are not available in Expo Go or React Native.
  - This typically happens if a server-side or Node.js-specific package is included in the project dependencies.
- **Next Steps:**
  - Review `package.json` for any Node.js-only packages (e.g., `ws`, `socket.io`, `express`, etc.) and remove or replace them with React Native/Expo compatible alternatives.
  - Use the built-in `WebSocket` API for real-time features in React Native/Expo.
  - Keep server-side code separate from the Expo project.
  - Continue troubleshooting by checking all dependencies and imports for Node.js-only usage.

---

### Multi-Step Document Creation & Context (June 2024)

- Implemented a React Context (`DocumentContext`) to store new document form data in memory across navigation steps.
- When a user fills out the form in `/document/new` and clicks "Next":
  - The form data (code, company_id, user_id, document_date, status) is saved in context, not yet sent to the database.
  - The user is navigated to the `/scanner` page.
- On the `/scanner` page, the form data is displayed at the top for review, confirming the information before any database save or further processing.
- This approach enables a true multi-step form flow, improves user experience, and prevents premature database writes.
- Next: Integrate the actual document creation and detail saving after scanning is complete.

---

### Multi-Step Document Processing & Export Flow (June 2024)

- Defined a multi-step flow for document creation and processing:
  1. User fills out the document form (head info) in `/document/new`.
  2. User scans or selects images in `/scanner`.
  3. Images are processed with OCR/AI to extract body information (name, entry time, exit time).
  4. If no valid data is extracted, the app displays: "The AI ​​could not obtain any information from the images" and provides links to return to the scanner or dashboard.
  5. If valid data is extracted, the app displays:
     - Head information
     - A select for export format (PDF, text, CSV, Excel)
     - A table with the extracted body info
     - A "Generate Document" button
  6. On "Generate Document":
     - Head info is saved to the `documents` table
     - The returned document ID is used to save each row of body info to the `documents_details` table
     - The requested document is generated (PDF, etc.)
     - The user is prompted for an email to send the document
- Updated the database table name for body information to `documents_details` (plural, as per latest schema)
- Next: Implement the new `/document/process` page and connect all steps in the flow

---

### Revert: Removal of Google Vision/OCR Integration (June 2024)

- **Issue:** After integrating Google Cloud Vision and related OCR/AI features, persistent errors and instability were encountered (Metro bundler ENOENT errors, missing/broken dependencies, and workflow issues).
- **Decision:** Revert all changes related to Google Vision/OCR and restore the last known working state (manual document processing and export flow).
- **Files affected:**
  - `app/document/process.jsx` reverted to load document and images from Supabase, allow manual data entry/editing, and export/email as before.
  - `app/utils/visionApi.js` and related OCR code are no longer used.
  - `app/utils/documentStorage.js` and new storage utilities are no longer used.
  - All references to `processDocumentImages`, Google Vision, and OCR have been removed from the workflow.
- **Current state:**
  - The app now uses manual data entry for document processing and export.
  - Users scan/select images, which are uploaded to Supabase Storage.
  - The process page loads images and allows manual entry/editing of employee data.
  - Export (PDF, CSV, XLSX) and email sending work as before, without OCR/AI.
  - The app is stable and the scan-to-process-to-export flow is functional.
- **Next steps:**
  - Continue with the development plan using the manual workflow.
  - Consider reintroducing OCR/AI in the future with a more robust approach if needed.

---

### Calendar/Date Picker Restored in New Document Form (June 2024)

- **Issue:** The calendar/date picker was not showing in the "New Document" form after recent changes and refactors.
- **Fix:** Updated the form to use a visible `<input type="date">` for web and `@react-native-community/datetimepicker` for native platforms.
- **Result:**
  - Users can now select a date easily on all platforms.
  - The selected date is stored in `YYYY-MM-DD` format and displayed as `MM/DD/YYYY`.
  - The multi-step document creation flow (form → scan → process → export) is fully functional again.
  - The app is stable and ready for the next development steps.

---

### Date Input Restrictions & Locale Consistency (June 2024)

- **Change:** The date input in the New Document form is now restricted to today or earlier (future dates are not allowed) on all platforms.
- **Implementation:**
  - On web, the `<input type="date">` uses the `max` attribute set to today.
  - On native, the `DateTimePicker` uses `maximumDate={new Date()}`.
- **Date Format:**
  - All user-facing date fields now display dates in MM/DD/YYYY format.
  - Dates are stored internally as YYYY-MM-DD for consistency.
- **Locale:**
  - The calendar on iOS is now forced to English (`locale="en-US"`).
  - On Android and web, the picker follows the device/browser language.
- **Result:**
  - The multi-step document creation and scanning flow is robust, user-friendly, and locale-consistent for date handling.
  - Users cannot select a future date, ensuring accurate assistance control records.

---

### OCR Integration Reintroduced: Google Vision API in 'Process Images' Workflow (June 2024)

- **Decision:** Resume integrating OCR (Google Vision API) into the workflow, specifically triggered by the 'Process Images' button in `scanner.jsx`.
- **Workflow:**
  1. When the user clicks 'Process Images', all selected images are sent to the Google Vision API for OCR processing.
  2. The OCR results are parsed for compatible data (Employee Name, Start Time, End Time).
  3. If no valid data is found, the user is notified and the workflow stops.
  4. If valid data is found, it is stored in context and the app navigates to the process/export page.
  5. On the process/export page, the user can review, edit, export, and email the extracted data, or save it locally.
- **Context:**
  - This is a reintroduction of OCR after a previous rollback due to technical issues.
  - The implementation will proceed step by step, starting with the OCR integration in the scanner step.

---

### Latest Updates: Manual Testing & Final Cleanup (June 2024)

#### Manual Testing of Updated Screens
- **Screens Tested:**
  - Login & Register screens
  - Dashboard
  - New Document
  - Document History
  - Scanner
  - Edit
  - Process
  - History Detail
- **Results:**
  - All screens now use global styles consistently.
  - UI is unified across the app, with no regressions.
  - Navigation and functionality work as expected.

#### Final Cleanup
- Removed unused and duplicate files/styles.
- Ensured all screens use centralized global styles.
- Verified that the app is stable and ready for further testing or deployment.

#### Next Steps
- Proceed with unit and integration testing.
- Prepare for deployment.

---

### Unit and Integration Testing (June 2024)

#### Testing Strategy
- **Unit Tests:**
  - Focus on critical components (e.g., authentication, document processing, OCR).
  - Use Jest and React Testing Library for component testing.
  - Mock Supabase and external API calls.
- **Integration Tests:**
  - Test end-to-end flows (e.g., login → dashboard → document creation → export).
  - Use Expo EAS for testing on real devices.
  - Verify data persistence and state management.

#### Initial Results
- **Unit Tests:**
  - Authentication components pass all tests.
  - Document processing logic is robust.
  - OCR integration tests are pending.
- **Integration Tests:**
  - Login and document creation flows work as expected.
  - Export and email sending are functional.

#### Next Steps
- Complete OCR integration tests.
- Finalize deployment preparation.

---

(Continue appending new decisions, summaries, and important context below as the project progresses.) 