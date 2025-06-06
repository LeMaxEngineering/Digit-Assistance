import { supabase } from '../config/supabase';

/**
 * Interface defining the contract for document operations
 */
class IDocumentOperations {
  async deleteDocument(documentId) {
    throw new Error('Method not implemented');
  }

  async getDocument(documentId) {
    throw new Error('Method not implemented');
  }

  async getDocumentDetails(documentId) {
    throw new Error('Method not implemented');
  }
}

/**
 * Base class for database operations
 */
class DatabaseOperations {
  constructor() {
    if (this.constructor === DatabaseOperations) {
      throw new Error('Abstract class cannot be instantiated');
    }
    this.supabase = supabase;
  }

  async executeQuery(query) {
    try {
      const result = await query;
      return {
        success: true,
        data: result.data,
        error: null
      };
    } catch (error) {
      console.error('Database operation failed:', error);
      return {
        success: false,
        data: null,
        error
      };
    }
  }
}

/**
 * Document Manager class implementing document operations
 * @implements {IDocumentOperations}
 */
class DocumentManager extends DatabaseOperations {
  constructor() {
    super();
    this.tableName = 'documents';
    this.detailsTableName = 'documents_details';
  }

  /**
   * Validates document ID
   * @private
   */
  #validateDocumentId(documentId) {
    if (!documentId) {
      throw new Error('Document ID is required');
    }
  }

  /**
   * Check if a document already exists for the given parameters
   * @private
   * @param {Object} params - Document parameters
   * @param {string} params.company_id - Company ID
   * @param {string} params.place_id - Place ID
   * @param {string} params.document_date - Document date (from scanned document)
   * @param {string} [params.excludeId] - Optional ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if document exists
   */
  async #checkDocumentExists({ company_id, place_id, document_date, excludeId }) {
    try {
      console.log('Checking for existing document with:', {
        company_id,
        place_id,
        document_date,
        excludeId
      });

      let query = this.supabase
        .from(this.tableName)
        .select('id, company_id, place_id, document_date')
        .eq('company_id', company_id)
        .eq('place_id', place_id)
        .eq('document_date', document_date);

      // If excludeId is provided, exclude that document from the check
      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking document existence:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('Found existing document:', data[0]);
        return true;
      }

      console.log('No existing document found');
      return false;
    } catch (error) {
      console.error('Error in checkDocumentExists:', error);
      throw error;
    }
  }

  /**
   * Verifies document existence
   * @private
   */
  async #verifyDocumentExists(documentId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('id', documentId)
      .single();

    if (error) {
      throw new Error(`Document verification failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Document not found');
    }

    return data;
  }

  /**
   * Counts document details
   * @private
   */
  async #countDocumentDetails(documentId) {
    const { count, error } = await this.supabase
      .from(this.detailsTableName)
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Failed to count document details: ${error.message}`);
    }

    return count;
  }

  /**
   * Deletes document details
   * @private
   */
  async #deleteDocumentDetails(documentId) {
    const { error } = await this.supabase
      .from(this.detailsTableName)
      .delete()
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Failed to delete document details: ${error.message}`);
    }
  }

  /**
   * Deletes the main document
   * @private
   */
  async #deleteMainDocument(documentId) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', documentId);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Verifies document deletion
   * @private
   */
  async #verifyDeletion(documentId) {
    // Add a small delay to allow for database consistency
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('id', documentId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Deletion verification failed: ${error.message}`);
    }

    if (data) {
      throw new Error('Document still exists after deletion attempt');
    }
  }

  /**
   * Validates document data
   * @private
   * @param {Object} documentData - Document data to validate
   * @throws {Error} If validation fails
   */
  #validateDocumentData(documentData) {
    if (!documentData) {
      throw new Error('Document data is required');
    }

    if (!documentData.company_id) {
      throw new Error('Company ID is required');
    }

    if (!documentData.place_id) {
      throw new Error('Place ID is required');
    }

    if (!documentData.document_date) {
      throw new Error('Document date is required');
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(documentData.document_date)) {
      throw new Error('Invalid document date format. Expected YYYY-MM-DD');
    }

    // Validate that scanned date matches selected date
    if (documentData.scanned_date && documentData.scanned_date !== documentData.document_date) {
      throw new Error(`Scanned document date (${documentData.scanned_date}) does not match selected date (${documentData.document_date}). Please correct the date before proceeding.`);
    }
  }

  /**
   * Standardized document deletion procedure
   * @public
   * @param {string} documentId - The ID of the document to delete
   * @returns {Promise<{success: boolean, error: Error|null, details: {deletedDetails: number, deletedDocument: boolean}}>}
   */
  async deleteDocument(documentId) {
    try {
      // 1. Validate input
      this.#validateDocumentId(documentId);

      // 2. Verify document exists
      await this.#verifyDocumentExists(documentId);
      
      // 3. Delete document details first
      await this.#deleteDocumentDetails(documentId);

      // 4. Delete main document
      await this.#deleteMainDocument(documentId);

      // 5. Verify deletion
      await this.#verifyDeletion(documentId);

      // 6. Return success response
      return {
        success: true,
        error: null,
        details: {
          deletedDocument: true
        }
      };
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      // 7. Return error response
      return {
        success: false,
        error,
        details: {
          deletedDocument: false
        }
      };
    }
  }

  /**
   * Fetches a document by its ID
   * @public
   */
  async getDocument(documentId) {
    try {
      this.#validateDocumentId(documentId);
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          companies (
            name
          ),
          place:places (
            name
          )
        `)
        .eq('id', documentId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error
      };
    }
  }

  /**
   * Fetches document details
   * @public
   */
  async getDocumentDetails(documentId) {
    try {
      this.#validateDocumentId(documentId);
      
      const { data, error } = await this.supabase
        .from(this.detailsTableName)
        .select('*')
        .eq('document_id', documentId)
        .order('id');

      if (error) throw error;

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error
      };
    }
  }

  /**
   * Create a new document
   * @public
   * @param {Object} documentData - Document data
   * @returns {Promise<{success: boolean, error: Error|null, document: Object|null}>}
   */
  async createDocument(documentData) {
    try {
      console.log('Creating document with data:', documentData);
      
      // 1. Validate input
      this.#validateDocumentData(documentData);

      // 2. Check for existing document
      const exists = await this.#checkDocumentExists({
        company_id: documentData.company_id,
        place_id: documentData.place_id,
        document_date: documentData.document_date
      });
      
      console.log('Document exists check result:', exists);

      if (exists) {
        throw new Error('A document already exists for this company, date, and place. Please select a different date or place, update the existing document, or delete the stored document.');
      }

      // 3. Create document
      const { data: document, error: createError } = await this.supabase
        .from(this.tableName)
        .insert([{
          ...documentData,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating document:', createError);
        throw createError;
      }

      console.log('Document created successfully:', document);

      return {
        success: true,
        error: null,
        document
      };
    } catch (error) {
      console.error('Error in createDocument:', error);
      return {
        success: false,
        error,
        document: null
      };
    }
  }
}

// Export a singleton instance
export const documentManager = new DocumentManager(); 