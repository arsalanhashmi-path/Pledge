from flask import Flask, jsonify, request, g
from flask_cors import CORS
from dotenv import load_dotenv
import os
from supabase import create_client
from datetime import datetime, timezone
from middleware import authenticate_user
from utils.student_identity import infer_student_identity

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Allow CORS for the frontend origin
CORS(app, resources={r"/api/*": {"origins": "*"}})

def get_db():
    """
    Returns a Supabase client authenticated as the current user.
    Requires @authenticate_user middleware to have run.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    client = create_client(url, key)
    client.postgrest.auth(g.token)
    return client

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Pledge Backend is running'})

@app.route('/api/me', methods=['GET'])
@authenticate_user
def me():
    return jsonify({
        'message': 'Authenticated successfully',
        'user_id': g.user.id,
        'email': g.user.email,
        'aud': g.user.aud
    })

@app.route('/api/auth/verify-student', methods=['GET'])
@authenticate_user
def verify_student():
    try:
        identity = infer_student_identity(g.user.email)
        return jsonify({'success': True, 'identity': identity}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 403
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/onboarding', methods=['POST'])
@authenticate_user
def onboarding():
    try:
        data = request.get_json()
        if not data:
             return jsonify({'error': 'Missing request body'}), 400

        first_name = data.get('first_name')
        last_name = data.get('last_name')
        
        # Student specific fields
        institution_id = data.get('institution_id')
        campus_code = data.get('campus_code')
        batch_year = data.get('batch_year')
        roll_number = data.get('roll_number')
        major = data.get('major')
        is_hostelite = data.get('is_hostelite', False)
        societies = data.get('societies', [])
        ghost_mode = data.get('ghost_mode', False)

        if not first_name or not last_name or not institution_id:
            return jsonify({'error': 'Missing required fields'}), 400

        referrer_id = data.get('referrer_id')

        client = get_db()

        payload = {
            'user_id': g.user.id,
            'email': g.user.email,
            'first_name': first_name,
            'last_name': last_name,
            'institution': institution_id, # Keep legacy field aligned for now
            'institution_id': institution_id,
            'campus_code': campus_code,
            'batch_year': batch_year,
            'roll_number': roll_number,
            'major': major,
            'is_hostelite': is_hostelite,
            'societies': societies,
            'ghost_mode': ghost_mode
        }

        # Perform upsert
        res = client.table('public_profiles').upsert(payload).execute()

        # Handle Referral
        print(f"DEBUG: Onboarding referrer_id_raw: {referrer_id}")
        if referrer_id and referrer_id != g.user.id and referrer_id != 'null':
            try:
                low_id, high_id = sorted([g.user.id, referrer_id])
                
                conn_payload = {
                    'low_id': low_id,
                    'high_id': high_id,
                    'requested_by': g.user.id,
                    'accepted': True,
                    'accepted_at': datetime.now(timezone.utc).isoformat()
                }
                # Optimistic insert - relying on DB constrains to reject duplicates/invalid users
                # This reduces round-trips from 3 (Check User, Check Conn, Insert) to 1 (Insert)
                client.table('connections').insert(conn_payload).execute()
                print(f"DEBUG: Auto-connected referrer {referrer_id}")
            except Exception as e:
                # Ignore duplicate key errors or RLS issues if they aren't critical
                print(f"DEBUG: Referrer auto-connect failed (likely exists): {e}")

        # --- Receipt Recovery Logic ---
        # Check if anyone sent receipts to this email before they signed up
        try:
            # Find orphaned receipts
            receipts_query = client.table('receipts').select('id, from_user_id').ilike('recipient_email', g.user.email).is_('to_user_id', 'null').execute()
            
            if receipts_query.data:
                print(f"DEBUG: Found {len(receipts_query.data)} orphan receipts for {g.user.email}")
                
                # Group by sender to minimize connection logic
                sender_ids = set(r['from_user_id'] for r in receipts_query.data)

                for sender_id in sender_ids:
                    # 1. Ensure Connection Exists
                    # We can reuse the same logic: try insert, ignore if exists, or fetch.
                    # Since we need the connection_id for the receipt, we MUST fetch or upsert-and-return.
                    
                    low_id, high_id = sorted([g.user.id, sender_id])
                    connection_id = None

                    # Try fetching existing first (could be the referrer from above, or existing)
                    existing_conn = client.table('connections').select('id').eq('low_id', low_id).eq('high_id', high_id).maybe_single().execute()
                    
                    if existing_conn.data:
                        connection_id = existing_conn.data['id']
                    else:
                        # Create new connection
                        new_conn_payload = {
                            'low_id': low_id,
                            'high_id': high_id,
                            'requested_by': g.user.id, # New user "accepts" the implicit invite
                            'accepted': True,
                            'accepted_at': datetime.now(timezone.utc).isoformat()
                        }
                        try:
                            # Using upsert to be safe and get data back
                            create_res = client.table('connections').upsert(new_conn_payload).execute()
                            if create_res.data:
                                connection_id = create_res.data[0]['id']
                        except Exception as conn_err:
                            print(f"DEBUG: Failed to create connection for receipt recovery: {conn_err}")
                            continue # Skip linking receipts if connection failed

                    if connection_id:
                        # 2. Update Receipts
                        # Update all receipts from this sender to this user
                        update_payload = {
                            'to_user_id': g.user.id,
                            'connection_id': connection_id,
                            'status': 'AWAITING_ACCEPTANCE'
                        }
                        client.table('receipts').update(update_payload).eq('recipient_email', g.user.email).is_('to_user_id', 'null').eq('from_user_id', sender_id).execute()
                        print(f"DEBUG: Linked receipts from {sender_id} to {g.user.id}")

        except Exception as e:
            print(f"DEBUG: Receipt recovery error: {e}")
        
        return jsonify({'success': True, 'data': res.data}), 200

    except Exception as e:
        print(f"Onboarding Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/connections', methods=['GET'])
@authenticate_user
def get_connections():
    try:
        client = get_db()
        uid = g.user.id
        
        # Fetch connections where user is involved
        res = client.table('connections').select('*').or_(f"low_id.eq.{uid},high_id.eq.{uid}").execute()
        
        return jsonify({'success': True, 'data': res.data}), 200

    except Exception as e:
        print(f"Get Connections Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/connections/request', methods=['POST'])
@authenticate_user
def request_connection():
    try:
        data = request.get_json()
        target_email = data.get('email', '').strip().lower()
        if not target_email:
             return jsonify({'error': 'Target email required'}), 400

        client = get_db()

        # 1. Find Target User
        # Note: public_profiles is viewable by all, so this is safe
        target_res = client.table('public_profiles').select('user_id').eq('email', target_email).execute()
        
        # Check if we got data
        if not target_res.data or len(target_res.data) == 0:
            return jsonify({'error': 'User not found. They must sign up for Pledge first.'}), 404
        
        target_id = target_res.data[0]['user_id']
        
        if target_id == g.user.id:
            return jsonify({'error': 'Cannot connect to self'}), 400

        # 2. Check Existing
        low_id, high_id = sorted([g.user.id, target_id])
        
        # Check for existing connection between these two
        existing_res = client.table('connections').select('*').eq('low_id', low_id).eq('high_id', high_id).execute()
        
        if existing_res.data and len(existing_res.data) > 0:
            existing = existing_res.data[0]
            if existing['accepted']:
                 return jsonify({'error': 'Already connected'}), 400
            if existing['requested_by'] == g.user.id:
                 return jsonify({'error': 'Request already sent'}), 400
            return jsonify({'error': 'They already sent you a request'}), 400

        # 3. Create Connection
        payload = {
            'low_id': low_id,
            'high_id': high_id,
            'requested_by': g.user.id,
            'accepted': False
        }
        res = client.table('connections').insert(payload).execute()
        
        return jsonify({'success': True, 'message': 'Request sent'}), 200

    except Exception as e:
        print(f"Connection Request Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/connections/remove', methods=['POST'])
@authenticate_user
def remove_connection():
    try:
        data = request.get_json()
        connection_id = data.get('connection_id')
        if not connection_id:
             return jsonify({'error': 'Connection ID required'}), 400

        client = get_db()

        # Delete (RLS will enforce permissions)
        res = client.table('connections').delete().eq('id', connection_id).execute()
        
        return jsonify({'success': True}), 200

    except Exception as e:
        print(f"Remove Connection Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/connections/accept', methods=['POST'])
@authenticate_user
def accept_connection():
    try:
        data = request.get_json()
        connection_id = data.get('connection_id')
        if not connection_id:
             return jsonify({'error': 'Connection ID required'}), 400

        client = get_db()

        # Update
        res = client.table('connections').update({
            'accepted': True,
            'accepted_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', connection_id).execute()
        
        return jsonify({'success': True}), 200

    except Exception as e:
        print(f"Accept Connection Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/receipts/create', methods=['POST'])
@authenticate_user
def create_receipt():
    try:
        data = request.json
        recipient_email = data.get('email')
        tags = data.get('tags', [])
        description = data.get('description', '')
        is_public = data.get('is_public', False)

        if not recipient_email:
            return jsonify({'success': False, 'error': 'Recipient email is required'}), 400

        client = get_db()
        from_user_id = g.user.id
        
        # Default State
        status = 'AWAITING_SIGNUP'
        to_user_id = None
        connection_id = None

        # 1. Check if recipient exists
        # Using .execute() directly avoids potential NoneType issues with maybe_single() on some client versions
        recipient_query = client.table('public_profiles').select('user_id').ilike('email', recipient_email).execute()
        
        if recipient_query.data and len(recipient_query.data) > 0:
            to_user_id = recipient_query.data[0]['user_id']
            
            # Prevent self-receipts
            if to_user_id == from_user_id:
                 return jsonify({'success': False, 'error': 'Cannot send receipt to yourself'}), 400

            # 2. Check Connection
            low_id, high_id = sorted([from_user_id, to_user_id])
            conn_query = client.table('connections').select('id, accepted').eq('low_id', low_id).eq('high_id', high_id).execute()

            if conn_query.data and len(conn_query.data) > 0 and conn_query.data[0]['accepted']:
                status = 'AWAITING_ACCEPTANCE'
                connection_id = conn_query.data[0]['id']
            else:
                status = 'AWAITING_CONNECTION'
        
        # 3. Insert Receipt
        payload = {
            'from_user_id': from_user_id,
            'to_user_id': to_user_id,
            'recipient_email': recipient_email,
            'tags': tags,
            'description': description,
            'is_public': is_public,
            'status': status,
            'connection_id': connection_id,
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        res = client.table('receipts').insert(payload).execute()
        
        if not res.data:
            raise Exception("Failed to insert receipt")

        return jsonify({'success': True, 'receipt': res.data[0]}), 200

    except Exception as e:
        print(f"Create Receipt Error: {str(e)}")
        # Print traceback for deeper debugging
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/receipts/claim', methods=['POST'])
@authenticate_user
def claim_receipt():
    try:
        data = request.json
        receipt_id = data.get('receipt_id')
        if not receipt_id:
             return jsonify({'success': False, 'error': 'Receipt ID required'}), 400

        client = get_db()
        
        # 1. Fetch Receipt
        receipt_query = client.table('receipts').select('*').eq('id', receipt_id).execute()
        
        if not receipt_query.data or len(receipt_query.data) == 0:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404
            
        receipt = receipt_query.data[0]
        
        print(f"DEBUG: Claiming receipt {receipt_id}. Owner: {receipt.get('to_user_id')}, User: {g.user.id}, Email: {receipt.get('recipient_email')}")

        # 2. Authorization & Late Binding Logic
        # Allow claim if:
        # a) User is the assigned recipient
        # b) User is NOT assigned (None) BUT matches the email (Late Binding)
        
        is_assigned = receipt['to_user_id'] == g.user.id
        is_email_match = (receipt['to_user_id'] is None) and (receipt['recipient_email'].lower() == g.user.email.lower())

        if not (is_assigned or is_email_match):
             return jsonify({'success': False, 'error': 'Not authorized to claim this receipt'}), 403

        # 3. Handle Late Linking / Connection Check
        # If we just linked by email, or if connection is missing for some reason, ensure it exists now.
        if is_email_match or not receipt.get('connection_id'):
            # Ensure connection exists
            low_id, high_id = sorted([g.user.id, receipt['from_user_id']])
            
            # Upsert connection to be safe
            conn_payload = {
                'low_id': low_id,
                'high_id': high_id,
                'requested_by': g.user.id, # Accepting receipt implies requesting/accepting connection
                'accepted': True,
                'accepted_at': datetime.now(timezone.utc).isoformat()
            }
            conn_res = client.table('connections').upsert(conn_payload).execute()
            
            # If we just created/fetched it, update the receipt with the link
            if conn_res.data and len(conn_res.data) > 0:
                 client.table('receipts').update({
                     'to_user_id': g.user.id,
                     'connection_id': conn_res.data[0]['id']
                 }).eq('id', receipt_id).execute()

        # 4. Status Check
        # We allow claiming AWAITING_SIGNUP if we just did late binding
        allowed_statuses = ['AWAITING_ACCEPTANCE', 'AWAITING_SIGNUP', 'AWAITING_CONNECTION']
        if receipt['status'] not in allowed_statuses and not is_email_match:
             # Logic tweak: If it was AWAITING_SIGNUP and we matched email, we allow it.
             # If it was already linked but in weird state, block it?
             # Let's be permissive if it's not already ACCEPTED/REJECTED
             if receipt['status'] in ['ACCEPTED', 'REJECTED']:
                  return jsonify({'success': False, 'error': f"Receipt already {receipt['status']}"}), 400

        # 5. Update Status
        res = client.table('receipts').update({
            'status': 'ACCEPTED'
        }).eq('id', receipt_id).execute()

        return jsonify({'success': True}), 200

    except Exception as e:
        print(f"Claim Receipt Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/receipts/reject', methods=['POST'])
@authenticate_user
def reject_receipt():
    try:
        data = request.json
        receipt_id = data.get('receipt_id')
        if not receipt_id:
             return jsonify({'success': False, 'error': 'Receipt ID required'}), 400

        client = get_db()
        
        # 1. Fetch Receipt
        receipt_query = client.table('receipts').select('*').eq('id', receipt_id).execute()
        
        if not receipt_query.data or len(receipt_query.data) == 0:
            return jsonify({'success': False, 'error': 'Receipt not found'}), 404
            
        receipt = receipt_query.data[0]

        # 2. Authorization
        if receipt['to_user_id'] != g.user.id:
             return jsonify({'success': False, 'error': 'Not authorized to reject this receipt'}), 403
        
        # 3. Update
        res = client.table('receipts').update({
            'status': 'REJECTED'
        }).eq('id', receipt_id).execute()

        return jsonify({'success': True}), 200

    except Exception as e:
        print(f"Reject Receipt Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
@authenticate_user
def get_leaderboard():
    try:
        client = get_db()
        
        # 1. Fetch Aggregated Stats (Optimized)
        stats_res = client.table('leaderboard_stats').select('*').execute()
        
        if not stats_res.data:
             return jsonify({'success': True, 'top_givers': [], 'top_receivers': []}), 200

        # 2. Fetch User Profiles (Batch)
        # Only fetch profiles for users who are in the leaderboard stats
        user_ids = [r['user_id'] for r in stats_res.data]
        profiles_res = client.table('public_profiles').select('user_id, first_name, last_name, institution').in_('user_id', user_ids).execute()
        profiles_map = {p['user_id']: p for p in profiles_res.data}

        # 3. Format & Sort
        def format_entry(stat, type_key):
            uid = stat['user_id']
            profile = profiles_map.get(uid, {})
            return {
                'user_id': uid,
                'name': f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or 'Unknown User',
                'institution': profile.get('institution', 'Unknown'),
                'count': stat.get(type_key, 0)
            }

        # Python-side sorting is fine for <10k users. 
        # For larger scales, we would query the DB with .order().limit() separately for givers/receivers.
        
        top_givers = sorted(
            [format_entry(s, 'given_count') for s in stats_res.data if s.get('given_count', 0) > 0],
            key=lambda x: x['count'], 
            reverse=True
        )[:50]

        top_receivers = sorted(
            [format_entry(s, 'received_count') for s in stats_res.data if s.get('received_count', 0) > 0],
            key=lambda x: x['count'], 
            reverse=True
        )[:50]

        return jsonify({
            'success': True, 
            'top_givers': top_givers, 
            'top_receivers': top_receivers
        }), 200

    except Exception as e:
        print(f"Leaderboard Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/institutions/graph', methods=['GET'])
@authenticate_user
def get_institution_graph():
    try:
        client = get_db()
        
        # Fetch relationships
        rels_res = client.table('institution_relationships').select('*').gt('exchange_count', 0).execute()
        rels = rels_res.data or []

        # Extract unique nodes and calculate stats
        institutions = {} # Map id -> {id, label, stats: {given: 0, received: 0}}
        links = []

        for r in rels:
            src = r['from_institution']
            tgt = r['to_institution']
            count = r['exchange_count']
            
            # Ensure nodes exist in map
            if src not in institutions:
                institutions[src] = {'id': src, 'label': src, 'stats': {'given': 0, 'received': 0}}
            if tgt not in institutions:
                institutions[tgt] = {'id': tgt, 'label': tgt, 'stats': {'given': 0, 'received': 0}}
            
            # Update Stats
            institutions[src]['stats']['given'] += count
            institutions[tgt]['stats']['received'] += count
            
            links.append({
                'source': src,
                'target': tgt,
                'value': count
            })

        nodes = list(institutions.values())

        return jsonify({
            'success': True,
            'nodes': nodes,
            'links': links
        }), 200

    except Exception as e:
        print(f"Institution Graph Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
