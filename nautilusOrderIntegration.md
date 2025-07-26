🧠 NautilusTrader Integration Plan for Polygon Prediction Market App

Overview

This document outlines a phased plan to integrate NautilusTrader into a Python-based backend for a Polymarket (Polygon) prediction market trading app. The focus is on enabling manual outcome buying with advanced position management features such as max bid, sell price, and stop loss.

⸻

✅ Phase 1: Manual Buy + Position Creation

Frontend UI: Place Bet
	•	Form Inputs:
	•	Market
	•	Outcome
	•	Max Bid Price (required)
	•	Sell Price (optional)
	•	Stop Loss Price (optional)
	•	Action:
	•	Submit POST request to /positions/

Backend API: POST /positions/
	•	Creates a new position with:
	•	market_id, outcome_id
	•	max_bid_price
	•	sell_price
	•	stop_loss_price
	•	status = "open"
	•	entry_price = null (until filled)
	•	Initiates trade:
	•	Uses NautilusTrader logic to:
	•	Place a limit buy at max_bid_price
	•	On success, updates entry_price, filled_at, volume

⸻

✅ Phase 2: Position Model

SQLAlchemy or Pydantic Position Model

class Position(Base):
    id = Column(UUID, primary_key=True)
    market_id = Column(String)
    outcome_id = Column(String)
    entry_price = Column(Float, nullable=True)
    max_bid_price = Column(Float)
    sell_price = Column(Float)
    stop_loss_price = Column(Float)
    filled_at = Column(DateTime, nullable=True)
    status = Column(Enum("open", "closed", "cancelled"))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


⸻

✅ Phase 3: Live Price Monitoring Service

Background Worker or Microservice
	•	Polls live prices every 15–60 seconds for markets with open positions
	•	For each position:
	•	If price ≤ stop loss → auto sell
	•	If price ≥ sell target → auto sell
	•	On sell:
	•	Update status = closed
	•	Log exit_price, exit_time, was_auto = True

⸻

✅ Phase 4: View + Manual Cashout

API Endpoints
	•	GET /positions/ — List all positions
	•	POST /positions/{id}/sell — Manually close position and sell

Frontend Table: Open Positions
	•	Display:
	•	Entry Price
	•	Current Price
	•	PnL Estimate
	•	Sell Button for Manual Cashout

⸻

🔮 Optional Future Features
	•	Trailing stop loss
	•	Partial position sells
	•	PnL and price history charting
	•	Alerts/notifications when stop-loss or sell targets are reached

⸻

❓ Questions to Address
	1.	How are live prices currently ingested—via the Polymarket orderbook API?
	2.	Are trades already executable via a wallet, or do you need wallet support too?
	3.	Should this support future automated trading logic (e.g. based on signals or news)?