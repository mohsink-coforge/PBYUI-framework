import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface SearchParams {
  name?: string;
  email?: string;
  customerId?: string;
  [key: string]: string | undefined;
}

interface CustomerSearchResponse {
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    [key: string]: any;
  }>;
  error?: string;
  message?: string;
}

class CustomerSearch {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.API_BASE_URL || 'http://localhost:3000';
    this.apiKey = apiKey || process.env.API_KEY || '';
  }

  /**
   * Search for customers by parameters
   * @param params Search parameters (name, email, customerId, etc.)
   * @returns Customer search results
   */
  async search(params: SearchParams): Promise<CustomerSearchResponse> {
    try {
      if (!params || Object.keys(params).length === 0) {
        return {
          success: false,
          error: 'No search parameters provided',
        };
      }

      // Filter out undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined)
      );

      const config: any = {
        params: cleanParams,
      };

      // Add API key to headers if available
      if (this.apiKey) {
        config.headers = {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        };
      }

      const response = await axios.get<CustomerSearchResponse>(
        `${this.baseUrl}/api/customers/search`,
        config
      );

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Search failed',
      };
    }
  }

  /**
   * Search by customer name
   */
  async searchByName(name: string): Promise<CustomerSearchResponse> {
    return this.search({ name });
  }

  /**
   * Search by email
   */
  async searchByEmail(email: string): Promise<CustomerSearchResponse> {
    return this.search({ email });
  }

  /**
   * Search by customer ID
   */
  async searchById(customerId: string): Promise<CustomerSearchResponse> {
    return this.search({ customerId });
  }

  /**
   * Search by multiple criteria
   */
  async searchByMultiple(criteria: SearchParams): Promise<CustomerSearchResponse> {
    return this.search(criteria);
  }
}

export default CustomerSearch;
