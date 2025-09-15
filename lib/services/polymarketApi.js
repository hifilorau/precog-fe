/**
 * Polymarket API service for fetching additional market data
 */

const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';

/**
 * Fetch CLOB token IDs for a market from Polymarket
 * @param {string} externalId - The external_id from our market (Polymarket's event ID)
 * @returns {Promise<string[]|null>} Array of CLOB token IDs or null if error
 */
export const getMarketClobTokenIds = async (externalId) => {
  if (!externalId) {
    console.warn('No external ID provided to getMarketClobTokenIds');
    return null;
  }

  try {
    console.log(`Fetching CLOB token IDs for external ID: ${externalId}`);
    const response = await fetch(`${POLYMARKET_API_BASE}/events/${externalId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch market data for external ID ${externalId}:`, response.statusText);
      return null;
    }

    const data = await response.json();

    // Get the first market's CLOB token IDs
    if (data.markets?.[0]?.clobTokenIds) {
      const clobTokenIds = JSON.parse(data.markets[0].clobTokenIds);
      console.log(`Found CLOB token IDs for ${externalId}:`, clobTokenIds);
      return clobTokenIds;
    }

    console.warn(`No CLOB token IDs found for external ID ${externalId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching CLOB token IDs for external ID ${externalId}:`, error);
    return null;
  }
};

/**
 * Get CLOB token ID for a specific outcome
 * @param {string} externalId - The external_id from our market
 * @param {number} outcomeIndex - Index of the outcome (0-based)
 * @returns {Promise<string|null>} CLOB token ID or null if error
 */
export const getOutcomeClobTokenId = async (externalId, outcomeIndex) => {
  const clobTokenIds = await getMarketClobTokenIds(externalId);

  if (clobTokenIds && outcomeIndex < clobTokenIds.length) {
    return clobTokenIds[outcomeIndex];
  }

  return null;
};

/**
 * Get full market data from Polymarket including CLOB info
 * @param {string} externalId - The external_id from our market
 * @returns {Promise<object|null>} Full market data or null if error
 */
export const getPolymarketEventData = async (externalId) => {
  if (!externalId) return null;

  try {
    const response = await fetch(`${POLYMARKET_API_BASE}/events/${externalId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch event data for external ID ${externalId}:`, response.statusText);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching event data for external ID ${externalId}:`, error);
    return null;
  }
};