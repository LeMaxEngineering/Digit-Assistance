import React, { createContext, useContext, useState } from 'react';

export const DocumentContext = createContext();

export function DocumentProvider({ children }) {
  const [documentData, setDocumentData] = useState({
    code: '',
    company: '',
    date: '',
    images: [],
    employeeData: null
  });

  return (
    <DocumentContext.Provider value={{ documentData, setDocumentData }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocument() {
  return useContext(DocumentContext);
} 