// Arkasel SMS API Integration
// API Documentation: https://sms.arkesel.com/

interface ArkaselConfig {
  apiKey: string;
  baseUrl: string;
  senderId: string;
}

interface SendSMSOptions {
  to: string;
  message: string;
  schedule?: string; // Format: YYYY-MM-DD HH:MM:SS
}

interface ContactOptions {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  userName?: string;
  phoneBook?: string;
}

interface ArkaselResponse {
  code: string;
  message: string;
  data?: any;
}

class ArkaselAPI {
  private config: ArkaselConfig;

  constructor(config: ArkaselConfig) {
    this.config = config;
  }

  /**
   * Fetch current Arkesel SMS balance
   */
  async getBalance(): Promise<number> {
    const url = `${this.config.baseUrl}/sms/api?action=check-balance&api_key=${encodeURIComponent(this.config.apiKey)}&response=json`;
    try {
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      // Expected: { balance: number | string }
      const raw = (data && (data.balance ?? data.BALANCE ?? data.points)) as number | string | undefined;
      const balance = typeof raw === 'string' ? parseFloat(raw) : typeof raw === 'number' ? raw : 0;
      return isNaN(balance) ? 0 : balance;
    } catch (error) {
      console.error('Arkasel getBalance Error:', error);
      return 0;
    }
  }

  /**
   * Send SMS message via Firebase Cloud Functions
   */
  async sendSMS(options: SendSMSOptions): Promise<ArkaselResponse> {
    try {
      const { to, message, schedule } = options;
      
      // Use Firebase Cloud Functions instead of direct API call
      const response = await fetch('https://us-central1-school-management-e6e17.cloudfunctions.net/sendSMS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          message,
          from: this.config.senderId,
          schedule
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Arkasel SMS Error:', error);
      return {
        code: '500',
        message: 'Failed to send SMS',
        data: error
      };
    }
  }

  /**
   * Add contact to phone book via Firebase Cloud Functions
   */
  async addContact(options: ContactOptions): Promise<ArkaselResponse> {
    try {
      const { phoneNumber, firstName, lastName, email, company, userName, phoneBook = 'SchoolContacts' } = options;
      
      // Use Firebase Cloud Functions instead of direct API call
      const response = await fetch('https://us-central1-school-management-e6e17.cloudfunctions.net/addContact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          firstName,
          lastName,
          email,
          company,
          userName,
          phoneBook
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Arkasel Contact Error:', error);
      return {
        code: '500',
        message: 'Failed to add contact',
        data: error
      };
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(recipients: string[], message: string, schedule?: string): Promise<ArkaselResponse[]> {
    const results: ArkaselResponse[] = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS({ to: recipient, message, schedule });
      results.push(result);
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Ghana phone number (10 digits starting with 0, or 13 digits starting with +233)
    return /^(0[2-9]\d{8}|233[2-9]\d{8})$/.test(cleaned);
  }

  /**
   * Format phone number for Ghana
   */
  formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('233')) {
      return cleaned; // Already in international format
    } else if (cleaned.startsWith('0')) {
      return '233' + cleaned.substring(1); // Convert to international format
    } else if (cleaned.length === 9) {
      return '233' + cleaned; // Add country code
    }
    
    return cleaned;
  }
}

// Default configuration
const defaultConfig: ArkaselConfig = {
  apiKey: 'R3VKVG1NRlZ4Wk5HQnZkVHZ6ZVI',
  baseUrl: 'https://sms.arkesel.com',
  senderId: 'JOHNWILLIAM' // Example: St. John's School (max 11 characters)
};

// Create default instance
export const arkaselAPI = new ArkaselAPI(defaultConfig);

// Export the class for custom configurations
export { ArkaselAPI, type ArkaselConfig, type SendSMSOptions, type ContactOptions, type ArkaselResponse };

// Utility functions for easy use
export const arkaselUtils = {
  /**
   * Send SMS to a single recipient
   */
  async sendSMS(to: string, message: string, schedule?: string): Promise<ArkaselResponse> {
    return await arkaselAPI.sendSMS({ to, message, schedule });
  },

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSMS(recipients: string[], message: string, schedule?: string): Promise<ArkaselResponse[]> {
    return await arkaselAPI.sendBulkSMS(recipients, message, schedule);
  },

  /**
   * Add contact to phone book
   */
  async addContact(contactData: ContactOptions): Promise<ArkaselResponse> {
    return await arkaselAPI.addContact(contactData);
  },

  /**
   * Send message to student's parent
   */
  async sendMessageToParent(studentName: string, parentPhone: string, message: string, schedule?: string): Promise<ArkaselResponse> {
    const formattedMessage = `Dear Parent/Guardian of ${studentName},\n\n${message}\n\nBest regards,\nSchool Management`;
    return await arkaselAPI.sendSMS({ to: parentPhone, message: formattedMessage, schedule });
  },

  /**
   * Send grade notification to parent
   */
  async sendGradeNotification(studentName: string, parentPhone: string, subject: string, grade: string, schedule?: string): Promise<ArkaselResponse> {
    const message = `Grade Update: ${studentName} received ${grade} in ${subject}. Check the school portal for detailed report.`;
    return await this.sendMessageToParent(studentName, parentPhone, message, schedule);
  },

  /**
   * Send attendance notification
   */
  async sendAttendanceNotification(studentName: string, parentPhone: string, status: 'present' | 'absent', date: string, schedule?: string): Promise<ArkaselResponse> {
    const message = `Attendance Update: ${studentName} was ${status} on ${date}.`;
    return await this.sendMessageToParent(studentName, parentPhone, message, schedule);
  },

  /**
   * Send fee payment reminder
   */
  async sendFeeReminder(studentName: string, parentPhone: string, amount: number, dueDate: string, schedule?: string): Promise<ArkaselResponse> {
    const message = `Fee Reminder: Payment of ₵${amount} for ${studentName} is due on ${dueDate}. Please make payment to avoid late fees.`;
    return await this.sendMessageToParent(studentName, parentPhone, message, schedule);
  },

  /**
   * Validate and format phone number
   */
  validateAndFormatPhone(phoneNumber: string): { isValid: boolean; formatted: string } {
    const isValid = arkaselAPI.validatePhoneNumber(phoneNumber);
    const formatted = arkaselAPI.formatPhoneNumber(phoneNumber);
    return { isValid, formatted };
  },

  /**
   * Get current Arkesel SMS balance (points)
   */
  async getBalance(): Promise<number> {
    return await arkaselAPI.getBalance();
  }
};
