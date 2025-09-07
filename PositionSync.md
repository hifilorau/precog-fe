# Position Synchronization Service

This service fixes the issue where positions exist on Polymarket but not in your local database, causing `poly-` prefixed IDs to appear in your frontend.

## The Problem

When you see errors like:
```
"Input should be a valid UUID, invalid character: expected an optional prefix of `urn:uuid:` followed by [0-9a-fA-F-], found `p` at 1"
"input":"poly-16139790475842626232400904750617845050647798818803546620691861020548144678738"
```

This means:
1. **Positions exist on Polymarket** that don't exist in your local database
2. **Orders/fills are missing** for positions that should have complete records
3. **Status mismatches** between Polymarket and your database

## The Solution

The sync service performs comprehensive synchronization:

### 1. **API Endpoints** (Recommended)

Check sync status:
```bash
GET /api/v1/sync/status
```

Dry run (see what would be synced):
```bash
POST /api/v1/sync/positions/dry-run
```

Run full sync:
```bash
POST /api/v1/sync/positions
```

### 2. **CLI Script**

Check what needs syncing:
```bash
cd /Users/hifilorau/code/predictions/prediction-helper
python scripts/sync_positions.py --dry-run
```

Run full synchronization:
```bash
python scripts/sync_positions.py
```

## What Gets Synchronized

### Missing Positions
For each position found on Polymarket but not in your DB:
- ✅ **Position record** (with correct status, volume, entry_price)
- ✅ **Order record** (reconstructed buy order)  
- ✅ **Fill record** (execution that created the position)

### Missing Orders/Fills
For positions that exist but are missing order/fill records:
- ✅ **Order records** for orders on Polymarket
- ✅ **Fill records** for executed orders
- ✅ **Status updates** to match Polymarket

### Status Synchronization
- 🔄 **Order statuses** (filled, cancelled, pending)
- 🔄 **Position statuses** (open, filled, won, lost)
- 🔄 **Timestamps** (filled_at, cancelled_at, etc.)

## Frontend Impact

After running sync:
1. **No more `poly-` IDs** - All positions will have proper UUIDs
2. **Orders visible** - You can see order history for all positions  
3. **Proper filtering** - Market tags and categories will work correctly
4. **Accurate status** - Position/order statuses match reality

## Configuration Required

Set these environment variables:
```bash
POLYMARKET_PK=your_private_key
POLYMARKET_FUNDER=your_wallet_address  
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
POLYMARKET_PASSPHRASE=your_passphrase
```

## When to Run Sync

**Run sync when you notice:**
- `poly-` prefixed IDs in frontend
- Positions on Polymarket not showing in your app
- Order/position status mismatches
- Missing order history for positions

**Recommended schedule:**
- **Manual**: When you notice discrepancies
- **Automatic**: Add to your scheduler to run every few hours
- **After issues**: Always run after fixing trading system bugs

## Example Output

```bash
$ python scripts/sync_positions.py --dry-run

============================================================
DRY RUN SUMMARY  
============================================================
Polymarket Positions: 12
Polymarket Orders: 28
Local Positions: 8
Local Orders: 15
Local Fills: 15

DISCREPANCIES:
  Missing Positions: 4
  Missing Orders: 13
  Status Mismatches: 2

📍 Missing Positions:
  - Asset: 21742633143463906290569050155826241533067272736897614950488156847949938836455, Size: 100.0, Avg Price: 0.52
  - Asset: 73950804134665242673041296119655934622352465097825801136973311884464082736268, Size: 50.0, Avg Price: 0.73

🔄 Status Mismatches:
  - Order abc123: pending → filled
  - Order def456: open → cancelled

💡 To apply these changes, run without --dry-run flag
============================================================
```

## Integration with Frontend

Update your frontend to handle the sync status:

1. **Add sync status check** to your dashboard
2. **Show sync button** when discrepancies are found
3. **Handle loading states** during sync operations
4. **Refresh position data** after successful sync

## Troubleshooting

**"No Polymarket client configured"**
- Check environment variables are set correctly
- Verify API credentials are valid

**"Failed to fetch Polymarket data"**  
- Check network connectivity
- Verify API endpoints are accessible
- Check API rate limits

**"Outcome not found for asset_id"**
- Run market harvesting first to ensure outcomes exist
- Check if markets are properly synced

**Sync creates duplicate positions**
- This shouldn't happen - file a bug report
- The service has duplicate detection built-in