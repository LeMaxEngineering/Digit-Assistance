/**
 * Class for parsing and validating scanned documents
 */
class DocumentParser {
  constructor() {
    this.dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i;
    this.validNameRegex = /^[A-Za-zÀ-ÿ''-\.\s]+$/;
  }

  /**
   * Validates a date string
   * @private
   * @param {string} dateStr - Date string in MM/DD/YYYY format
   * @returns {boolean} True if date is valid
   */
  #isValidDate(dateStr) {
    const [month, day, year] = dateStr.split('/').map(num => parseInt(num, 10));
    
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 2000 || year > 2100) return false;

    // Check for valid days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth;
  }

  /**
   * Extracts and validates dates from text
   * @private
   * @param {string} text - Text to extract dates from
   * @returns {string[]} Array of unique dates found
   */
  #extractDates(text) {
    const dates = new Set();
    let match;
    
    while ((match = this.dateRegex.exec(text)) !== null) {
      const dateStr = match[0];
      if (this.#isValidDate(dateStr)) {
        dates.add(dateStr);
      }
    }
    
    return Array.from(dates);
  }

  /**
   * Validates that all dates in the document match
   * @private
   * @param {string[]} dates - Array of dates found in document
   * @throws {Error} If dates don't match
   */
  #validateDates(dates) {
    if (dates.length === 0) {
      throw new Error('No valid dates found in the document');
    }

    if (dates.length > 1) {
      const firstDate = dates[0];
      const mismatchedDates = dates.filter(date => date !== firstDate);
      
      if (mismatchedDates.length > 0) {
        throw new Error(
          `Multiple dates found in document that do not match:\n` +
          `Primary date: ${firstDate}\n` +
          `Mismatched dates: ${mismatchedDates.join(', ')}\n` +
          `Please ensure all pages are from the same date.`
        );
      }
    }
  }

  /**
   * Parses the raw OCR text from a scanned document
   * @public
   * @param {string} rawText - The raw text from OCR
   * @returns {Object} Structured data containing date, worker records, and any validation warnings
   */
  parseScannedDocument(rawText) {
    // Debug logging
    console.log('Starting parseScannedDocument with input:', {
      type: typeof rawText,
      length: rawText?.length,
      preview: rawText?.substring(0, 200)
    });

    // Validate input
    if (!rawText || typeof rawText !== 'string') {
      console.error('Invalid input:', rawText);
      throw new Error('No document text provided for processing');
    }

    // Check if the text is empty or just whitespace
    if (!rawText.trim()) {
      console.error('Empty text input');
      throw new Error('Empty document: No text content found in the scanned document');
    }

    try {
      // Debug: Log the first 200 characters of the input
      console.log('Input text preview:', rawText.substring(0, 200));

      // More flexible header detection
      const headerPatterns = [
        /SIGN\s*IN\s*SHEET\s*:/i,
        /SIGN\s*IN\s*SHEET/i,
        /ATTENDANCE\s*SHEET/i,
        /TIME\s*SHEET/i,
        /DAILY\s*ATTENDANCE/i
      ];

      const headerMatch = headerPatterns.some(pattern => pattern.test(rawText));
      if (!headerMatch) {
        console.log('Header not found in document. Text preview:', rawText.substring(0, 200));
        throw new Error('Invalid document format. Please ensure the document is properly formatted.');
      }

      // Extract and validate all dates in the document
      const dates = this.#extractDates(rawText);
      this.#validateDates(dates);
      const documentDate = dates[0];
      console.log('Valid date found:', documentDate);

      // Split text into lines and filter out empty lines
      const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);
      console.log(`Document has ${lines.length} non-empty lines`);

      // Find the start of the worker records (after "NAMES" line)
      const namesPatterns = [
        /NAMES/i,
        /NAME/i,
        /EMPLOYEE/i,
        /WORKER/i,
        /STAFF/i,
        /PERSONNEL/i
      ];

      const namesIndex = lines.findIndex(line => 
        namesPatterns.some(pattern => pattern.test(line))
      );
      
      if (namesIndex === -1) {
        console.log('Names section not found in document. First few lines:', lines.slice(0, 5));
        throw new Error('Invalid document format: Missing employee names section. Please ensure the document contains employee names.');
      }

      // Find the columns (look for TIME IN, TIME OUT)
      let startIdx = namesIndex + 1;
      // Skip column headers if present
      const timePatterns = [
        /TIME\s*IN/i,
        /CLOCK\s*IN/i,
        /CHECK\s*IN/i,
        /IN\s*TIME/i
      ];
      const timeOutPatterns = [
        /TIME\s*OUT/i,
        /CLOCK\s*OUT/i,
        /CHECK\s*OUT/i,
        /OUT\s*TIME/i
      ];

      if (lines[startIdx] && timePatterns.some(pattern => pattern.test(lines[startIdx]))) startIdx++;
      if (lines[startIdx] && timeOutPatterns.some(pattern => pattern.test(lines[startIdx]))) startIdx++;

      // Parse worker records
      const workers = [];
      const usedIds = new Set(); // Track used worker IDs
      const usedNames = new Set(); // Track used worker names
      const warnings = []; // Collect warnings for display
      let i = startIdx;
      let currentPage = 1;

      while (i < lines.length) {
        // Check for page marker
        const pageMatch = lines[i].match(/Page\s+(\d+)(?:\s+of\s+\d+)?/i);
        if (pageMatch) {
          currentPage = parseInt(pageMatch[1], 10);
          console.log(`Found page ${currentPage}, continuing to next section`);
          i++;
          continue; // Skip the page marker line and continue processing
        }

        // Look for a line that's just a number (worker ID)
        const idMatch = lines[i].match(/^(\d{1,3})$/);
        if (idMatch) {
          const id = parseInt(idMatch[1]);
          
          // Check for duplicate ID
          if (usedIds.has(id)) {
            warnings.push(`Worker ID ${id} appears more than once. Please check for duplicate entries.`);
            i++;
            continue;
          }
          
          let name = null;
          let timeIn = null;
          let timeOut = null;

          // Next line: name (if not a number or time)
          if (i + 1 < lines.length && 
              !/^\d{1,3}$/.test(lines[i+1]) && 
              !/^\d{1,2}:?\d{2}$/.test(lines[i+1]) && 
              !/^\d{3,4}$/.test(lines[i+1])) {
            
            // Check if next line is a page marker
            const nextLinePageMatch = lines[i+1].match(/Page\s+\d+(?:\s+of\s+\d+)?/i);
            if (nextLinePageMatch) {
              currentPage = parseInt(nextLinePageMatch[1], 10);
              console.log(`Found page ${currentPage}, continuing to next section`);
              i++;
              continue;
            }

            name = lines[i+1].trim();
            
            // Validate name format
            if (!name || !this.validNameRegex.test(name)) {
              warnings.push(`Worker name "${name}" contains invalid characters. Please use only letters, spaces, hyphens, apostrophes, and dots.`);
              i++;
              continue;
            }

            // Skip if name is just a number
            if (/^\d+$/.test(name)) {
              warnings.push(`Invalid worker name "${name}" - cannot be just numbers`);
              i++;
              continue;
            }

            i++;
          }

          // Next line(s): time in/out (may be one or two lines)
          if (i + 1 < lines.length && (/^\d{1,2}:?\d{2}$/.test(lines[i+1]) || /^\d{3,4}$/.test(lines[i+1]))) {
            let rawTimeIn = lines[i+1];
            i++;
            // Validate timeIn
            let validTimeIn = null;
            if (rawTimeIn) {
              let numeric = rawTimeIn.replace(':', '');
              if (/^\d{3,4}$/.test(numeric) && (parseInt(numeric, 10) > 2359)) {
                validTimeIn = null;
              } else if (/^\d{1,2}:\d{2}$/.test(rawTimeIn)) {
                const [h, m] = rawTimeIn.split(':');
                if (parseInt(h, 10) > 23 || parseInt(m, 10) > 59) validTimeIn = null;
                else validTimeIn = rawTimeIn;
              } else if (/^\d{3,4}$/.test(rawTimeIn)) {
                const h = rawTimeIn.length === 3 ? rawTimeIn[0] : rawTimeIn.slice(0, 2);
                const m = rawTimeIn.length === 3 ? rawTimeIn.slice(1) : rawTimeIn.slice(2);
                if (parseInt(h, 10) > 23 || parseInt(m, 10) > 59) validTimeIn = null;
                else validTimeIn = (h + ':' + m);
              }
            }
            if (validTimeIn) timeIn = validTimeIn;

            // Check for timeOut
            if (i + 1 < lines.length && (/^\d{1,2}:?\d{2}$/.test(lines[i+1]) || /^\d{3,4}$/.test(lines[i+1]))) {
              let rawTimeOut = lines[i+1];
              i++;
              let validTimeOut = null;
              if (rawTimeOut) {
                let numeric = rawTimeOut.replace(':', '');
                if (/^\d{3,4}$/.test(numeric) && (parseInt(numeric, 10) > 2359)) {
                  validTimeOut = null;
                } else if (/^\d{1,2}:\d{2}$/.test(rawTimeOut)) {
                  const [h, m] = rawTimeOut.split(':');
                  if (parseInt(h, 10) > 23 || parseInt(m, 10) > 59) validTimeOut = null;
                  else validTimeOut = rawTimeOut;
                } else if (/^\d{3,4}$/.test(rawTimeOut)) {
                  const h = rawTimeOut.length === 3 ? rawTimeOut[0] : rawTimeOut.slice(0, 2);
                  const m = rawTimeOut.length === 3 ? rawTimeOut.slice(1) : rawTimeOut.slice(2);
                  if (parseInt(h, 10) > 23 || parseInt(m, 10) > 59) validTimeOut = null;
                  else validTimeOut = (h + ':' + m);
                }
              }
              if (validTimeOut) timeOut = validTimeOut;
            }
          }

          // Only add worker if they have a valid name
          if (name) {
            // Check for duplicate name (case-insensitive)
            const normalizedName = name.trim().toLowerCase();
            if (usedNames.has(normalizedName)) {
              warnings.push(`Worker name "${name}" appears more than once. Please check for duplicate entries.`);
              i++;
              continue;
            }

            // Validate that if there's an end time, there must be a start time
            if (timeOut && !timeIn) {
              warnings.push(`Worker "${name}" has a clock-out time but no clock-in time. Please add the clock-in time.`);
              i++;
              continue;
            }

            // Validate that end time is later than start time
            if (timeIn && timeOut) {
              const [inHours, inMinutes] = timeIn.split(':').map(Number);
              const [outHours, outMinutes] = timeOut.split(':').map(Number);
              const inTotalMinutes = inHours * 60 + inMinutes;
              const outTotalMinutes = outHours * 60 + outMinutes;
              
              if (outTotalMinutes <= inTotalMinutes) {
                warnings.push(`Worker "${name}" has clock-out time (${timeOut}) before clock-in time (${timeIn}). Please check the times.`);
                i++;
                continue;
              }
            }

            workers.push({
              id,
              name: name.trim(),
              timeIn: timeIn || null,
              timeOut: timeOut || null,
              page: currentPage // Add page number to worker record
            });
            usedIds.add(id); // Add ID to used set
            usedNames.add(normalizedName); // Add name to used set
            console.log(`Added worker: ${name} (ID: ${id}, Time In: ${timeIn}, Time Out: ${timeOut}, Page: ${currentPage})`);
          }
        }
        i++;
      }

      console.log(`Processed document: found ${workers.length} workers`);

      if (workers.length === 0) {
        throw new Error('No valid worker records found. Please ensure the document contains employee names and times.');
      }

      // Debug log the final workers array
      console.log('Final workers array:', JSON.stringify(workers, null, 2));
      console.log('Warnings:', warnings);

      return {
        date: documentDate,
        workers: workers,
        warnings: warnings
      };
    } catch (error) {
      console.error('Error in parseScannedDocument:', error);
      throw new Error(`Error parsing document: ${error.message}`);
    }
  }

  /**
   * Validates the parsed document data
   * @public
   * @param {Object} parsedData - The parsed document data
   * @returns {Object} Validation result with isValid flag and any error messages
   */
  validateParsedDocument(parsedData) {
    const errors = [];

    // Debug log the input data
    console.log('Validating parsed data:', JSON.stringify(parsedData, null, 2));

    if (!parsedData.date) {
      errors.push('Document date not found');
    }

    if (!parsedData.workers || !Array.isArray(parsedData.workers)) {
      errors.push('Invalid worker records format');
      return {
        isValid: false,
        errors
      };
    }

    if (!parsedData.workers.length) {
      errors.push('No worker records found');
    }

    // Check for workers with missing time data
    const workersWithMissingTime = parsedData.workers.filter(
      worker => !worker.timeIn && !worker.timeOut
    );

    if (workersWithMissingTime.length > 0) {
      errors.push(`Found ${workersWithMissingTime.length} workers with missing time data`);
    }

    // Add any warnings from the parsing process
    if (parsedData.warnings && parsedData.warnings.length > 0) {
      errors.push(...parsedData.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formats the parsed document data for display
   * @public
   * @param {Object} parsedData - The parsed document data
   * @returns {Object} Formatted data ready for display
   */
  formatDocumentForDisplay(parsedData) {
    return {
      date: parsedData.date,
      totalWorkers: parsedData.workers.length,
      workersWithTimeData: parsedData.workers.filter(w => w.timeIn || w.timeOut).length,
      workers: parsedData.workers.map(worker => ({
        ...worker,
        status: !worker.timeIn && !worker.timeOut ? 'Missing Time Data' :
                !worker.timeIn ? 'Missing Time In' :
                !worker.timeOut ? 'Missing Time Out' : 'Complete'
      }))
    };
  }
}

// Create a singleton instance
const documentParser = new DocumentParser();

// Export the singleton instance
export default documentParser;

// Export the parseScannedDocument function directly
export const parseScannedDocument = (text) => {
  if (!text) {
    throw new Error('No text provided for parsing');
  }
  return documentParser.parseScannedDocument(text);
}; 