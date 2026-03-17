# Python ML Service

## Architecture
This service acts as a **local API microservice**.
- **Node.js (Backend)** sends HTTP requests to this service.
- **Python (Flask)** processes the request and returns the response.

## Prerequisites
> [!WARNING]
> **Python is currently not installed** on this machine.
> You must install Python 3.8+ and add it to your PATH to run this service.
> Alternatively, we can switch to an external API (like OpenAI) if you prefer not to install Python.

## Setup
1. Install Python 3.x
2. Run `pip install -r requirements.txt`
3. Run `python app.py`
