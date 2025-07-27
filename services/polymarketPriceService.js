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
   * Get current prices for opportunities
   * @param {Array} opportunities - Array of opportunity objects
   * @returns {Promise<Map>} Map of opportunity.id -> current price
   */
  async getOpportunityPrices(opportunities) {
    const tokenParams = [];
    
    for (const opp of opportunities) {
      // Try to get CLOB token ID from outcome or market
      let tokenId = null;
      
      if (opp.outcome && opp.outcome.clob_id) {
        tokenId = opp.outcome.clob_id;
      } else if (opp.market && opp.market.outcomes && opp.market.outcomes.length > 0) {
        // Find the outcome that matches this opportunity
        const matchingOutcome = opp.market.outcomes.find(outcome => 
          outcome.id === opp.outcome_id || 
          (opp.market.outcomes.length === 1) // Single outcome market
        );
        
        if (matchingOutcome && matchingOutcome.clob_id) {
          tokenId = matchingOutcome.clob_id;
        }
      }

      if (tokenId) {
        tokenParams.push({
          tokenId,
          side: 'buy', // Get buy price for current market price
          opportunityId: opp.id
        });
      }
    }

    if (tokenParams.length === 0) return new Map();

    const priceMap = await this.getPrices(tokenParams);
    const opportunityPrices = new Map();

    // Map prices back to opportunity IDs
    for (const param of tokenParams) {
      const price = priceMap.get(param.tokenId);
      if (price !== undefined) {
        opportunityPrices.set(param.opportunityId, price);
      }
    }

    return opportunityPrices;
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
