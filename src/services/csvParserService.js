const fs = require('fs-extra');
const { parse } = require('csv-parse');
const path = require('path');

/**
 * CSV Parser Service for WageGuard
 * Handles CSV file parsing, validation, and data processing
 */
class CSVParserService {
  constructor() {
    // Expected column headers for different CSV types
    this.expectedColumns = {
      payroll: ['worker_id', 'worker_name', 'hours', 'pay', 'period_start', 'period_end'],
      rota: ['worker_id', 'worker_name', 'date', 'start_time', 'end_time', 'break_minutes'],
      timesheet: ['worker_id', 'worker_name', 'date', 'hours_worked', 'pay_rate', 'total_pay']
    };

    // Extended expected columns for NMW compliance calculations
    this.extendedColumns = {
      payroll: [
        'worker_id', 'worker_name', 'hours', 'pay', 'period_start', 'period_end',
        // Deductions that reduce NMW pay
        'uniform_deduction', 'tools_deduction', 'training_deduction', 'other_deductions',
        // Offsets that can be added to NMW pay
        'accommodation_charge', 'meals_charge', 'transport_charge',
        // Additional pay components for payroll
        'bonus', 'commission', 'tips', 'tronc'
      ],
      rota: [
        'worker_id', 'worker_name', 'date', 'start_time', 'end_time', 'break_minutes',
        // Additional fields for rota-based calculations
        'shift_premium', 'overtime_rate', 'holiday_pay'
      ],
      timesheet: [
        'worker_id', 'worker_name', 'date', 'hours_worked', 'pay_rate', 'total_pay',
        // Additional fields for timesheet-based calculations
        'bonus', 'commission', 'tips', 'tronc'
      ]
    };
    
    // Column mapping for different CSV formats
    this.columnMappings = {
      // Common variations of column names
      worker_id: ['worker_id', 'employee_id', 'staff_id', 'id', 'worker', 'employee'],
      worker_name: ['worker_name', 'employee_name', 'staff_name', 'name', 'full_name'],
      hours: ['hours', 'hours_worked', 'total_hours', 'worked_hours', 'hrs'],
      pay: ['pay', 'total_pay', 'gross_pay', 'wages', 'salary', 'amount'],
      period_start: ['period_start', 'start_date', 'from_date', 'week_start', 'month_start'],
      period_end: ['period_end', 'end_date', 'to_date', 'week_end', 'month_end'],
      date: ['date', 'work_date', 'shift_date', 'day'],
      start_time: ['start_time', 'clock_in', 'begin_time', 'start'],
      end_time: ['end_time', 'clock_out', 'finish_time', 'end'],
      break_minutes: ['break_minutes', 'break_time', 'break', 'rest_time'],
      pay_rate: ['pay_rate', 'hourly_rate', 'rate', 'per_hour'],
      total_pay: ['total_pay', 'gross_pay', 'pay', 'wages', 'amount'],
      
      // Deduction fields that reduce NMW pay
      uniform_deduction: ['uniform_deduction', 'uniform_cost', 'workwear_deduction', 'clothing_cost', 'uniform_charge'],
      tools_deduction: ['tools_deduction', 'tools_cost', 'equipment_deduction', 'equipment_cost', 'tools_charge'],
      training_deduction: ['training_deduction', 'training_cost', 'certification_cost', 'course_fee'],
      other_deductions: ['other_deductions', 'misc_deductions', 'additional_deductions', 'other_costs'],
      
      // Offset fields that can be added to NMW pay
      accommodation_charge: ['accommodation_charge', 'accommodation_cost', 'housing_charge', 'lodging_fee', 'room_charge'],
      meals_charge: ['meals_charge', 'meal_cost', 'food_charge', 'subsistence_charge', 'lunch_cost'],
      transport_charge: ['transport_charge', 'transport_cost', 'travel_cost', 'commute_cost', 'fuel_cost'],
      
      // Additional fields for enhanced calculations
      shift_premium: ['shift_premium', 'night_shift', 'weekend_premium', 'unsocial_hours'],
      overtime_rate: ['overtime_rate', 'overtime_multiplier', 'ot_rate'],
      holiday_pay: ['holiday_pay', 'holiday_allowance', 'annual_leave_pay'],
      bonus: ['bonus', 'performance_bonus', 'incentive_pay'],
      commission: ['commission', 'sales_commission', 'performance_pay'],
      tips: ['tips', 'gratuities', 'service_charge'],
      tronc: ['tronc', 'service_charge_pool', 'tip_pool']
    };
  }

  /**
   * Parse CSV file and return structured data
   * @param {string} filePath - Path to CSV file
   * @param {string} csvType - Type of CSV (payroll, rota, timesheet)
   * @returns {Promise<Object>} Parsed data with validation results
   */
  async parseCSV(filePath, csvType = 'payroll') {
    try {
      console.log(`🔄 Parsing CSV file: ${filePath}`);
      
      // Validate file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      // Parse CSV content
      const parsedData = await this.parseCSVContent(fileContent, csvType);
      
      // Validate parsed data
      const validationResult = this.validateParsedData(parsedData, csvType);
      
      // Process and structure data
      const processedData = this.processData(parsedData.data, csvType);
      
      // Categorize deduction and offset components
      const components = this.categorizeComponents(processedData);
      
      return {
        success: true,
        filePath,
        csvType,
        totalRows: parsedData.data.length,
        validRows: processedData.length,
        invalidRows: validationResult.errors.length,
        columnMapping: parsedData.columnMapping,
        data: processedData,
        components: components,
        validation: validationResult,
        metadata: {
          fileSize: (await fs.stat(filePath)).size,
          encoding: 'utf-8',
          parsedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('❌ CSV parsing failed:', error);
      return {
        success: false,
        error: error.message,
        filePath,
        csvType
      };
    }
  }

  /**
   * Parse CSV content using csv-parse library
   * @param {string} content - CSV content as string
   * @param {string} csvType - Type of CSV
   * @returns {Promise<Object>} Parsed data with column mapping
   */
  parseCSVContent(content, csvType) {
    return new Promise((resolve, reject) => {
      const results = [];
      let headers = [];
      let columnMapping = {};
      let isFirstRow = true;

      const parser = parse({
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        skip_empty_lines: true,
        trim: true
      });

      parser.on('readable', function() {
        let record;
        while (record = parser.read()) {
          if (isFirstRow) {
            // Process headers
            headers = record.map(h => h.trim().toLowerCase());
            columnMapping = this.mapColumns(headers, csvType);
            isFirstRow = false;
          } else {
            // Process data rows
            const rowData = {};
            headers.forEach((header, index) => {
              if (columnMapping[header]) {
                rowData[columnMapping[header]] = record[index];
              } else {
                rowData[header] = record[index];
              }
            });
            results.push(rowData);
          }
        }
      }.bind(this));

      parser.on('error', function(err) {
        reject(err);
      });

      parser.on('end', function() {
        resolve({
          data: results,
          columnMapping,
          headers
        });
      });

      parser.write(content);
      parser.end();
    });
  }

  /**
   * Map CSV columns to standardized field names
   * @param {Array} headers - CSV headers
   * @param {string} csvType - Type of CSV
   * @returns {Object} Column mapping
   */
  mapColumns(headers, csvType) {
    const mapping = {};
    
    headers.forEach(header => {
      // Find matching standard column
      for (const [standardColumn, variations] of Object.entries(this.columnMappings)) {
        if (variations.includes(header)) {
          mapping[header] = standardColumn;
          break;
        }
      }
      
      // If no match found, keep original header
      if (!mapping[header]) {
        mapping[header] = header;
      }
    });
    
    return mapping;
  }

  /**
   * Validate parsed CSV data
   * @param {Object} parsedData - Parsed CSV data
   * @param {string} csvType - Type of CSV
   * @returns {Object} Validation results
   */
  validateParsedData(parsedData, csvType) {
    const errors = [];
    const warnings = [];
    
    // Check if required columns are present
    const requiredColumns = this.expectedColumns[csvType] || this.expectedColumns.payroll;
    const mappedColumns = Object.values(parsedData.columnMapping);
    
    const missingColumns = requiredColumns.filter(col => !mappedColumns.includes(col));
    if (missingColumns.length > 0) {
      errors.push({
        type: 'missing_columns',
        message: `Missing required columns: ${missingColumns.join(', ')}`,
        severity: 'error'
      });
    }
    
    // Validate data rows
    parsedData.data.forEach((row, index) => {
      const rowErrors = this.validateRow(row, csvType, index + 2); // +2 for 1-based index and header row
      errors.push(...rowErrors);
    });
    
    // Check for empty file
    if (parsedData.data.length === 0) {
      warnings.push({
        type: 'empty_file',
        message: 'CSV file contains no data rows',
        severity: 'warning'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalErrors: errors.length,
      totalWarnings: warnings.length
    };
  }

  /**
   * Validate individual data row
   * @param {Object} row - Data row
   * @param {string} csvType - Type of CSV
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Array} Array of validation errors
   */
  validateRow(row, csvType, rowNumber) {
    const errors = [];
    
    // Check for required fields based on CSV type
    if (csvType === 'payroll') {
      if (!row.worker_id || row.worker_id.trim() === '') {
        errors.push({
          type: 'missing_worker_id',
          message: `Row ${rowNumber}: Missing worker ID`,
          row: rowNumber,
          severity: 'error'
        });
      }
      
      if (!row.hours || isNaN(parseFloat(row.hours))) {
        errors.push({
          type: 'invalid_hours',
          message: `Row ${rowNumber}: Invalid or missing hours`,
          row: rowNumber,
          severity: 'error'
        });
      }
      
      if (!row.pay || isNaN(parseFloat(row.pay))) {
        errors.push({
          type: 'invalid_pay',
          message: `Row ${rowNumber}: Invalid or missing pay amount`,
          row: rowNumber,
          severity: 'error'
        });
      }
    }
    
    // Check for data type issues
    if (row.hours && parseFloat(row.hours) < 0) {
      errors.push({
        type: 'negative_hours',
        message: `Row ${rowNumber}: Hours cannot be negative`,
        row: rowNumber,
        severity: 'error'
      });
    }
    
    if (row.pay && parseFloat(row.pay) < 0) {
      errors.push({
        type: 'negative_pay',
        message: `Row ${rowNumber}: Pay cannot be negative`,
        row: rowNumber,
        severity: 'error'
      });
    }
    
    return errors;
  }

  /**
   * Process and structure parsed data
   * @param {Array} data - Raw parsed data
   * @param {string} csvType - Type of CSV
   * @returns {Array} Processed data
   */
  processData(data, csvType) {
    return data.map(row => {
      const processed = { ...row };
      
      // Convert numeric fields
      if (processed.hours) {
        processed.hours = parseFloat(processed.hours) || 0;
      }
      
      if (processed.pay) {
        processed.pay = parseFloat(processed.pay) || 0;
      }
      
      if (processed.pay_rate) {
        processed.pay_rate = parseFloat(processed.pay_rate) || 0;
      }
      
      if (processed.break_minutes) {
        processed.break_minutes = parseInt(processed.break_minutes) || 0;
      }

      // Process deduction fields (reduce NMW pay)
      if (processed.uniform_deduction) {
        processed.uniform_deduction = parseFloat(processed.uniform_deduction) || 0;
      }
      
      if (processed.tools_deduction) {
        processed.tools_deduction = parseFloat(processed.tools_deduction) || 0;
      }
      
      if (processed.training_deduction) {
        processed.training_deduction = parseFloat(processed.training_deduction) || 0;
      }
      
      if (processed.other_deductions) {
        processed.other_deductions = parseFloat(processed.other_deductions) || 0;
      }

      // Process offset fields (can be added to NMW pay)
      if (processed.accommodation_charge) {
        processed.accommodation_charge = parseFloat(processed.accommodation_charge) || 0;
      }
      
      if (processed.meals_charge) {
        processed.meals_charge = parseFloat(processed.meals_charge) || 0;
      }
      
      if (processed.transport_charge) {
        processed.transport_charge = parseFloat(processed.transport_charge) || 0;
      }

      // Process enhancement fields
      if (processed.shift_premium) {
        processed.shift_premium = parseFloat(processed.shift_premium) || 0;
      }
      
      if (processed.overtime_rate) {
        processed.overtime_rate = parseFloat(processed.overtime_rate) || 0;
      }
      
      if (processed.holiday_pay) {
        processed.holiday_pay = parseFloat(processed.holiday_pay) || 0;
      }
      
      if (processed.bonus) {
        processed.bonus = parseFloat(processed.bonus) || 0;
      }
      
      if (processed.commission) {
        processed.commission = parseFloat(processed.commission) || 0;
      }
      
      if (processed.tips) {
        processed.tips = parseFloat(processed.tips) || 0;
      }
      
      if (processed.tronc) {
        processed.tronc = parseFloat(processed.tronc) || 0;
      }
      
      // Parse dates
      if (processed.period_start) {
        processed.period_start = this.parseDate(processed.period_start);
      }
      
      if (processed.period_end) {
        processed.period_end = this.parseDate(processed.period_end);
      }
      
      if (processed.date) {
        processed.date = this.parseDate(processed.date);
      }
      
      // Calculate derived fields
      if (processed.hours && processed.pay) {
        processed.effective_hourly_rate = processed.hours > 0 ? processed.pay / processed.hours : 0;
      }
      
      return processed;
    });
  }

  /**
   * Parse date string to Date object
   * @param {string} dateString - Date string
   * @returns {Date|null} Parsed date or null if invalid
   */
  parseDate(dateString) {
    if (!dateString) return null;
    
    // Try different date formats
    const dateFormats = [
      'YYYY-MM-DD',
      'DD/MM/YYYY',
      'MM/DD/YYYY',
      'DD-MM-YYYY',
      'MM-DD-YYYY'
    ];
    
    for (const format of dateFormats) {
      try {
        // Simple date parsing - in production, use a library like moment.js or date-fns
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  /**
   * Identify and categorize deduction and offset components from parsed data
   * @param {Array} data - Parsed CSV data
   * @returns {Object} Categorized components for NMW calculations
   */
  categorizeComponents(data) {
    const components = {
      deductions: {
        uniform: [],
        tools: [],
        training: [],
        other: []
      },
      offsets: {
        accommodation: [],
        meals: [],
        transport: []
      },
      enhancements: {
        shift_premium: [],
        overtime: [],
        holiday_pay: [],
        bonus: [],
        commission: [],
        tips: [],
        tronc: []
      },
      summary: {
        totalDeductions: 0,
        totalOffsets: 0,
        totalEnhancements: 0,
        workersWithDeductions: 0,
        workersWithOffsets: 0
      }
    };

    data.forEach((row, index) => {
      // Process deductions (reduce NMW pay)
      if (row.uniform_deduction && parseFloat(row.uniform_deduction) > 0) {
        components.deductions.uniform.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.uniform_deduction),
          row: index + 2
        });
        components.summary.totalDeductions += parseFloat(row.uniform_deduction);
      }

      if (row.tools_deduction && parseFloat(row.tools_deduction) > 0) {
        components.deductions.tools.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.tools_deduction),
          row: index + 2
        });
        components.summary.totalDeductions += parseFloat(row.tools_deduction);
      }

      if (row.training_deduction && parseFloat(row.training_deduction) > 0) {
        components.deductions.training.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.training_deduction),
          row: index + 2
        });
        components.summary.totalDeductions += parseFloat(row.training_deduction);
      }

      if (row.other_deductions && parseFloat(row.other_deductions) > 0) {
        components.deductions.other.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.other_deductions),
          row: index + 2
        });
        components.summary.totalDeductions += parseFloat(row.other_deductions);
      }

      // Process offsets (can be added to NMW pay)
      if (row.accommodation_charge && parseFloat(row.accommodation_charge) > 0) {
        components.offsets.accommodation.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.accommodation_charge),
          row: index + 2
        });
        components.summary.totalOffsets += parseFloat(row.accommodation_charge);
      }

      if (row.meals_charge && parseFloat(row.meals_charge) > 0) {
        components.offsets.meals.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.meals_charge),
          row: index + 2
        });
        components.summary.totalOffsets += parseFloat(row.meals_charge);
      }

      if (row.transport_charge && parseFloat(row.transport_charge) > 0) {
        components.offsets.transport.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.transport_charge),
          row: index + 2
        });
        components.summary.totalOffsets += parseFloat(row.transport_charge);
      }

      // Process enhancements (additional pay components)
      if (row.shift_premium && parseFloat(row.shift_premium) > 0) {
        components.enhancements.shift_premium.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.shift_premium),
          row: index + 2
        });
        components.summary.totalEnhancements += parseFloat(row.shift_premium);
      }

      if (row.overtime_rate && parseFloat(row.overtime_rate) > 0) {
        components.enhancements.overtime.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          rate: parseFloat(row.overtime_rate),
          row: index + 2
        });
      }

      if (row.holiday_pay && parseFloat(row.holiday_pay) > 0) {
        components.enhancements.holiday_pay.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.holiday_pay),
          row: index + 2
        });
        components.summary.totalEnhancements += parseFloat(row.holiday_pay);
      }

      if (row.bonus && parseFloat(row.bonus) > 0) {
        components.enhancements.bonus.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.bonus),
          row: index + 2
        });
        components.summary.totalEnhancements += parseFloat(row.bonus);
      }

      if (row.commission && parseFloat(row.commission) > 0) {
        components.enhancements.commission.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.commission),
          row: index + 2
        });
        components.summary.totalEnhancements += parseFloat(row.commission);
      }

      if (row.tips && parseFloat(row.tips) > 0) {
        components.enhancements.tips.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.tips),
          row: index + 2
        });
        components.summary.totalEnhancements += parseFloat(row.tips);
      }

      if (row.tronc && parseFloat(row.tronc) > 0) {
        components.enhancements.tronc.push({
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          amount: parseFloat(row.tronc),
          row: index + 2
        });
        components.summary.totalEnhancements += parseFloat(row.tronc);
      }
    });

    // Count unique workers with deductions and offsets
    const workersWithDeductions = new Set();
    const workersWithOffsets = new Set();

    Object.values(components.deductions).forEach(deductionList => {
      deductionList.forEach(deduction => {
        workersWithDeductions.add(deduction.worker_id);
      });
    });

    Object.values(components.offsets).forEach(offsetList => {
      offsetList.forEach(offset => {
        workersWithOffsets.add(offset.worker_id);
      });
    });

    components.summary.workersWithDeductions = workersWithDeductions.size;
    components.summary.workersWithOffsets = workersWithOffsets.size;

    return components;
  }

  /**
   * Generate CSV processing report
   * @param {Object} parseResult - Result from parseCSV method
   * @returns {Object} Processing report
   */
  generateReport(parseResult) {
    if (!parseResult.success) {
      return {
        status: 'failed',
        error: parseResult.error,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      status: 'completed',
      timestamp: new Date().toISOString(),
      fileInfo: {
        path: parseResult.filePath,
        type: parseResult.csvType,
        size: parseResult.metadata.fileSize,
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        invalidRows: parseResult.invalidRows
      },
      validation: parseResult.validation,
      columnMapping: parseResult.columnMapping,
      processingTime: parseResult.metadata.parsedAt
    };
  }
}

module.exports = CSVParserService;
