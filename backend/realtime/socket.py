from flask_socketio import SocketIO, emit
from flask import request

# --- REALTIME SYNC ENGINE ---
# Maintains active neural links between Python Core and UI
socket_instance = None
connected_clients = set()

def setup_socket(app):
    """
    Configures Socket.IO for the Flask application.
    
    Args:
        app (Flask): The main Flask application instance.
        
    Returns:
        SocketIO: The initialized socket instance.
    """
    global socket_instance
    socket_instance = SocketIO(app, cors_allowed_origins="*")

    @socket_instance.on('connect')
    def on_connect():
        # Track the Session ID for regional monitoring
        connected_clients.add(request.sid)
        print(f"[REALTIME] Neural Handshake Established: {request.sid}")

    @socket_instance.on('disconnect')
    def on_disconnect():
        # Purge the Session ID from the active matrix
        connected_clients.discard(request.sid)
        print(f"[REALTIME] Neural Link Severed: {request.sid}")

    return socket_instance

def send_log_to_clients(log_data):
    """
    Broadcasts processed log telemetry to all authenticated UI clients.
    
    Args:
        log_data (dict): The structured log forensic data.
    """
    if socket_instance:
        # Emit over the 'realtime_log' channel for frontend capturing
        socket_instance.emit('realtime_log', log_data)
        print(f"[REALTIME] Telemetry broadcasted to {len(connected_clients)} active nodes.")
    else:
        print("[REALTIME] Error: Socket instance not initialized.")
