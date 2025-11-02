import axios, { AxiosInstance } from 'axios';
import https from 'https';

/**
 * Interactive Brokers Client Portal API Service
 * 
 * IMPORTANT: This service requires the IBKR Client Portal Gateway to be running.
 * Download and run from: https://download2.interactivebrokers.com/portal/clientportal.gw.zip
 * 
 * The gateway must be:
 * 1. Running on the specified gatewayUrl (default: https://localhost:5000)
 * 2. Authenticated via browser (navigate to gateway URL and login)
 * 3. Accessible from this application
 */

export interface IbkrAccount {
  id: string;
  accountVan: string;
  accountTitle: string;
  displayName: string;
  accountStatus: string;
  currency: string;
  type: string;
}

export interface IbkrPosition {
  accountId: string;
  conid: number;
  contractDesc: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  avgCost: number;
  avgPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  ticker: string;
}

export interface IbkrContract {
  conid: number;
  companyHeader: string;
  companyName: string;
  symbol: string;
  description: string;
  restricted: string;
  sections?: Array<{
    secType: string;
    months: string;
    exchange?: string;
  }>;
}

export interface IbkrOrderRequest {
  accountId: string;
  conid: number;
  ticker: string;
  orderType: 'MKT' | 'LMT' | 'STP';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  tif?: 'DAY' | 'GTC' | 'IOC';
}

export interface IbkrOrderResponse {
  orderId: string;
  orderStatus: string;
  encryptedMessage?: string;
}

export class IbkrService {
  private client: AxiosInstance;
  private gatewayUrl: string;

  constructor(gatewayUrl: string = 'https://localhost:5000') {
    this.gatewayUrl = gatewayUrl;
    
    // Create axios client with SSL verification disabled (for localhost)
    this.client = axios.create({
      baseURL: `${gatewayUrl}/v1/api`,
      timeout: 10000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Required for self-signed cert on localhost
      })
    });
  }

  /**
   * Check if the gateway is authenticated and ready
   */
  async checkAuthStatus(): Promise<{ authenticated: boolean; competing: boolean; connected: boolean }> {
    try {
      const response = await this.client.get('/iserver/auth/status');
      return response.data;
    } catch (error) {
      console.error('IBKR auth status check failed:', error);
      throw new Error('Failed to check IBKR authentication status. Is the gateway running?');
    }
  }

  /**
   * Get list of accounts
   */
  async getAccounts(): Promise<IbkrAccount[]> {
    try {
      const response = await this.client.get('/portfolio/accounts');
      return response.data;
    } catch (error) {
      console.error('IBKR get accounts failed:', error);
      throw new Error('Failed to fetch IBKR accounts');
    }
  }

  /**
   * Get portfolio positions for an account
   */
  async getPositions(accountId: string): Promise<IbkrPosition[]> {
    try {
      const response = await this.client.get(`/portfolio/${accountId}/positions/0`);
      return response.data;
    } catch (error) {
      console.error('IBKR get positions failed:', error);
      throw new Error('Failed to fetch IBKR positions');
    }
  }

  /**
   * Search for a stock by ticker symbol to get contract ID (conid)
   */
  async searchContract(symbol: string): Promise<IbkrContract[]> {
    try {
      const response = await this.client.get('/iserver/secdef/search', {
        params: { symbol }
      });
      return response.data;
    } catch (error) {
      console.error('IBKR contract search failed:', error);
      throw new Error(`Failed to search for ${symbol}`);
    }
  }

  /**
   * Get market data snapshot for a contract
   */
  async getMarketData(conid: number): Promise<any> {
    try {
      const response = await this.client.get('/iserver/marketdata/snapshot', {
        params: { 
          conids: conid,
          fields: '31,55,84,86' // Last price, symbol, bid, ask
        }
      });
      return response.data[0];
    } catch (error) {
      console.error('IBKR market data fetch failed:', error);
      throw new Error('Failed to fetch market data');
    }
  }

  /**
   * Place a market order
   */
  async placeOrder(orderRequest: IbkrOrderRequest): Promise<IbkrOrderResponse> {
    try {
      const orderPayload = {
        orders: [{
          conid: orderRequest.conid,
          orderType: orderRequest.orderType,
          side: orderRequest.side,
          quantity: orderRequest.quantity,
          tif: orderRequest.tif || 'DAY',
          ...(orderRequest.price && { price: orderRequest.price })
        }]
      };

      const response = await this.client.post(
        `/iserver/account/${orderRequest.accountId}/orders`,
        orderPayload
      );

      // IBKR may require confirmation for certain orders
      const orderData = response.data[0];
      
      if (orderData.id && !orderData.error) {
        // Auto-confirm the order
        try {
          const confirmResponse = await this.client.post(
            `/iserver/reply/${orderData.id}`,
            { confirmed: true }
          );
          
          return {
            orderId: orderData.id,
            orderStatus: confirmResponse.data.order_status || 'Submitted'
          };
        } catch (confirmError) {
          console.error('IBKR order confirmation failed:', confirmError);
          throw new Error('Order placed but confirmation failed');
        }
      } else if (orderData.error) {
        throw new Error(orderData.error);
      }

      return {
        orderId: orderData.id || 'unknown',
        orderStatus: orderData.order_status || 'Unknown'
      };
    } catch (error: any) {
      console.error('IBKR order placement failed:', error);
      throw new Error(error.response?.data?.error || 'Failed to place order');
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const response = await this.client.get(`/iserver/account/order/status/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('IBKR order status check failed:', error);
      throw new Error('Failed to get order status');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(accountId: string, orderId: string): Promise<any> {
    try {
      const response = await this.client.delete(`/iserver/account/${accountId}/order/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('IBKR order cancellation failed:', error);
      throw new Error('Failed to cancel order');
    }
  }

  /**
   * Helper: Place a market buy order by ticker symbol
   */
  async buyStock(accountId: string, ticker: string, quantity: number): Promise<IbkrOrderResponse> {
    // First, search for the contract
    const contracts = await this.searchContract(ticker);
    
    if (!contracts || contracts.length === 0) {
      throw new Error(`No contract found for ticker ${ticker}`);
    }

    // Find the stock contract (secType: STK)
    const stockContract = contracts.find(c => 
      c.sections?.some(s => s.secType === 'STK')
    );

    if (!stockContract) {
      throw new Error(`No stock contract found for ${ticker}`);
    }

    return this.placeOrder({
      accountId,
      conid: stockContract.conid,
      ticker,
      orderType: 'MKT',
      side: 'BUY',
      quantity,
      tif: 'DAY'
    });
  }

  /**
   * Helper: Place a market sell order by ticker symbol
   */
  async sellStock(accountId: string, ticker: string, quantity: number): Promise<IbkrOrderResponse> {
    const contracts = await this.searchContract(ticker);
    
    if (!contracts || contracts.length === 0) {
      throw new Error(`No contract found for ticker ${ticker}`);
    }

    const stockContract = contracts.find(c => 
      c.sections?.some(s => s.secType === 'STK')
    );

    if (!stockContract) {
      throw new Error(`No stock contract found for ${ticker}`);
    }

    return this.placeOrder({
      accountId,
      conid: stockContract.conid,
      ticker,
      orderType: 'MKT',
      side: 'SELL',
      quantity,
      tif: 'DAY'
    });
  }
}

// Singleton instance
let ibkrServiceInstance: IbkrService | null = null;

export function getIbkrService(gatewayUrl?: string): IbkrService {
  if (!ibkrServiceInstance || (gatewayUrl && ibkrServiceInstance['gatewayUrl'] !== gatewayUrl)) {
    ibkrServiceInstance = new IbkrService(gatewayUrl);
  }
  return ibkrServiceInstance;
}
