/**
 * Service for fetching real-time prices from Polymarket CLOB API
 */

const POLYMARKET_API_BASE = 'https://clob.polymarket.com';

class PolymarketPriceService {
  constructor() {
    this.priceCache = new Map();
    this.cacheExpiry = 30000; // 30 seconds cache
  }

  /**
   * Fetch current price for a single token
   * @param {string} tokenId - The CLOB token ID
   * @param {string} side - 'buy' or 'sell'
   * @returns {Promise<number|null>} Price as decimal (0-1) or null if error
   */
  async getPrice(tokenId, side = 'buy') {
    if (!tokenId) return null;

    const cacheKey = `${tokenId}-${side}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.price;
    }

    try {
      // Use the single price endpoint with query parameters
      const sideParam = side.toLowerCase() === 'buy' ? 'BUY' : 'SELL';
      const response = await fetch(`${POLYMARKET_API_BASE}/price?token_id=${tokenId}&side=${sideParam}`);

      if (!response.ok) {
        console.warn(`Failed to fetch price for token ${tokenId}:`, response.statusText);
        return null;
      }

      const data = await response.json();
      const price = parseFloat(data.price);
      
      // Cache the result
      this.priceCache.set(cacheKey, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      console.error(`Error fetching price for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Fetch current prices for multiple tokens in bulk
   * @param {Array} tokenParams - Array of {tokenId, side} objects
   * @returns {Promise<Map>} Map of tokenId -> price
   */
  async getPrices(tokenParams) {
    if (!tokenParams || tokenParams.length === 0) return new Map();

    // Filter out cached prices that are still valid
    const uncachedParams = [];
    const results = new Map();

    for (const param of tokenParams) {
      const cacheKey = `${param.tokenId}-${param.side}`;
      const cached = this.priceCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        results.set(param.tokenId, cached.price);
      } else {
        uncachedParams.push(param);
      }
    }

    // Fetch uncached prices
    if (uncachedParams.length > 0) {
      try {
        // Format the request body according to Polymarket API spec
        const bookParams = uncachedParams.map(param => ({
          token_id: param.tokenId,
          side: param.side.toUpperCase()
        }));

        const response = await fetch(`${POLYMARKET_API_BASE}/prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookParams)
        });

        if (!response.ok) {
          console.warn('Failed to fetch bulk prices:', response.statusText);
          return results;
        }

        const data = await response.json();
        
        // Process results and update cache
        for (const param of uncachedParams) {
          const tokenData = data[param.tokenId];
          if (tokenData && tokenData[param.side.toUpperCase()]) {
            const price = parseFloat(tokenData[param.side.toUpperCase()]);
            results.set(param.tokenId, price);
            
            // Cache the result
            const cacheKey = `${param.tokenId}-${param.side}`;
            this.priceCache.set(cacheKey, {
              price,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching bulk prices:', error);
      }
    }

    return results;
  }

  /**
   * Get current prices for a list of items with clob_id and outcome.id
   * @private
   * @param {Array} items - Array of items with clob_id and outcome.id
   * @returns {Promise<Map>} Map of outcome.id -> current price
   */
  async _getPricesForItems(items) {
    const tokenParams = [];
    console.log('getting prices in getPricesforItems')
    for (const item of items) {
      console.log('item', item)
      // Try to get CLOB token ID from item
      let tokenId = null;
      let outcomeId = null;
      
      // Handle opportunity format
      if (item.outcome && item.outcome.clob_id) {
        tokenId = item.outcome.clob_id;
        outcomeId = item.outcome.id;
      } 
      // Handle position format
      else if (item.outcome_id && item.outcome?.clob_id) {
        tokenId = item.outcome.clob_id;
        outcomeId = item.outcome_id;
      }
      // Handle market with outcomes
      else if (item.market?.outcomes?.length > 0) {
        // Find the outcome that matches this item
        const matchingOutcome = item.market.outcomes.find(outcome => 
          outcome.id === (item.outcome_id || item.outcome?.id) || 
          (item.market.outcomes.length === 1) // Single outcome market
        );
        
        if (matchingOutcome?.clob_id) {
          tokenId = matchingOutcome.clob_id;
          outcomeId = matchingOutcome.id;
        }
      }

      if (tokenId && outcomeId) {
        tokenParams.push({
          tokenId,
          side: 'buy', // Get buy price for current market price
          outcomeId: outcomeId
        });
      }
    }

    if (tokenParams.length === 0) return new Map();
    console.log('tokenParams', tokenParams)
    const priceMap = await this.getPrices(tokenParams);
    const resultPrices = new Map();

    // Map prices back to outcome IDs
    for (const param of tokenParams) {
      const price = priceMap.get(param.tokenId);
      if (price !== undefined) {
        resultPrices.set(param.outcomeId, price);
      }
    }

    return resultPrices;
  }

  /**
   * Get current prices for opportunities
   * @param {Array} opportunities - Array of opportunity objects
   * @returns {Promise<Map>} Map of outcome.id -> current price
   */
  async getOpportunityPrices(opportunities) {
    return this._getPricesForItems(opportunities);
  }

  /**
   * Get current prices for positions
   * @param {Array} positions - Array of position objects
   * @returns {Promise<Map>} Map of outcome.id -> current price
   */
  async getPositionPrices(positions) {
    return this._getPricesForItems(positions);
  }

  /**
   * Clear the price cache
   */
  clearCache() {
    this.priceCache.clear();
  }
}

// Export singleton instance
const polymarketPriceService = new PolymarketPriceService();
export default polymarketPriceService;
