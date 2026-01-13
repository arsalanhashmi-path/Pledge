from functools import wraps
from flask import request, jsonify, g
from supabase import create_client, Client
import os

def authenticate_user(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Missing Authorization Header'}), 401

        try:
            # Initialize Supabase client
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_KEY")
            
            print(f"Debug: URL set? {bool(url)}, Key set? {bool(key)}")

            if not url or not key:
                print("Error: Missing credentials in .env")
                return jsonify({'error': 'Server misconfiguration: Missing Supabase credentials'}), 500

            supabase: Client = create_client(url, key)

            # Extract token
            parts = auth_header.split(" ")
            if len(parts) != 2 or parts[0].lower() != "bearer":
                print(f"Error: Invalid Header Format: {auth_header}")
                return jsonify({'error': 'Invalid Authorization Header format'}), 401
            
            token = parts[1]
            # print(f"Debug: Verifying token: {token[:10]}...") 
            
            # Verify token via Supabase Auth
            res = supabase.auth.get_user(token)
            
            if not res or not res.user:
                 print("Error: Supabase returned no user for token.")
                 return jsonify({'error': 'Invalid or expired token'}), 401
            
            print(f"Debug: User verified: {res.user.id}")
            # Store user info in flask global context
            g.user = res.user
            g.token = token 

        except Exception as e:
            print(f"Auth Exception: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Authentication failed: {str(e)}'}), 401
            
        return f(*args, **kwargs)
    return decorated_function
