"""
Remodely AI - Website Grader API Server
Multi-tenant Aria AI Receptionist System
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from grader import grade_website
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)

# Database config - check if DATABASE_URL is set
database_url = os.environ.get('DATABASE_URL')
DB_ENABLED = False
DB_ERROR = None
db = None
AriaCompany = None
AriaLead = None

if database_url:
    try:
        from models import db as _db, AriaCompany as _AriaCompany, AriaLead as _AriaLead
        db = _db
        AriaCompany = _AriaCompany
        AriaLead = _AriaLead

        # Fix for Render PostgreSQL URL format
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)

        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_recycle': 300,
            'pool_pre_ping': True
        }

        # Initialize database
        db.init_app(app)

        # Create tables on startup
        with app.app_context():
            db.create_all()
            print("Database tables created successfully")
            DB_ENABLED = True
    except Exception as e:
        DB_ERROR = str(e)
        print(f"Database initialization error: {e}")
        import traceback
        traceback.print_exc()
        DB_ENABLED = False
else:
    print("DATABASE_URL not set - Aria multi-tenant features disabled")

# Email config
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASSWORD', '').replace(' ', '')
FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', SMTP_USER)


def send_email(to_email, subject, html_content, text_content):
    """Send email via Gmail SMTP"""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'Remodely AI <{FROM_EMAIL}>'
    msg['To'] = to_email

    msg.attach(MIMEText(text_content, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))

    context = ssl.create_default_context()

    with smtplib.SMTP('smtp.gmail.com', 587, timeout=30) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())


# =============================================================================
# WEBSITE GRADER ENDPOINTS
# =============================================================================

@app.route('/api/grade', methods=['POST', 'OPTIONS'])
def grade():
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'success': False, 'error': 'URL is required'}), 400

    url = data['url'].strip()
    if not url:
        return jsonify({'success': False, 'error': 'URL cannot be empty'}), 400

    try:
        result = grade_website(url)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    db_url = os.environ.get('DATABASE_URL', '')
    # Mask password in URL for display
    db_url_masked = db_url.split('@')[1] if '@' in db_url else 'not set'
    return jsonify({
        'status': 'ok',
        'smtp_user': SMTP_USER,
        'smtp_pass_set': bool(SMTP_PASS),
        'smtp_pass_len': len(SMTP_PASS) if SMTP_PASS else 0,
        'database_enabled': DB_ENABLED,
        'database_url_set': bool(db_url),
        'database_host': db_url_masked,
        'database_error': DB_ERROR
    })


@app.route('/api/test-smtp', methods=['GET'])
def test_smtp():
    """Test SMTP connectivity"""
    import socket
    results = {}

    # Test DNS
    try:
        ip = socket.gethostbyname('smtp.gmail.com')
        results['dns'] = f'OK - {ip}'
    except Exception as e:
        results['dns'] = f'FAIL - {e}'

    # Test socket connection
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect(('smtp.gmail.com', 587))
        sock.close()
        results['socket_587'] = 'OK'
    except Exception as e:
        results['socket_587'] = f'FAIL - {e}'

    # Test socket 465
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect(('smtp.gmail.com', 465))
        sock.close()
        results['socket_465'] = 'OK'
    except Exception as e:
        results['socket_465'] = f'FAIL - {e}'

    return jsonify(results)


@app.route('/api/send-report', methods=['POST', 'OPTIONS'])
def send_report():
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json()

    required = ['email', 'name', 'url', 'scores']
    for field in required:
        if field not in data:
            return jsonify({'success': False, 'error': f'{field} is required'}), 400

    email = data['email']
    name = data['name']
    url = data['url']
    scores = data['scores']

    overall_score = scores.get('overall', 0)
    ai_score = scores.get('ai_visibility', 0)
    overall_grade = scores.get('overall_grade', 'N/A')

    if overall_score >= 70:
        score_color = '#22c55e'
        score_message = "Good job! Your site has solid foundations."
    elif overall_score >= 50:
        score_color = '#eab308'
        score_message = "There's room for improvement."
    else:
        score_color = '#ef4444'
        score_message = "Your business is invisible to AI. This needs attention."

    greeting = f"Hi {name}," if name and name.lower() not in ['there', 'user', ''] else "Here's your report!"

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0f1a;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;margin:0;">REMODELY<span style="color:#3b82f6;">.AI</span></h1>
    </div>
    <div style="background:#131c2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;margin-bottom:24px;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 8px 0;">{greeting}</h2>
      <p style="color:#9ca3af;margin:0 0 24px 0;">Your AI Visibility Report for <strong style="color:#fff;">{url}</strong></p>
      <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="font-size:14px;color:#9ca3af;text-transform:uppercase;margin-bottom:8px;">Overall Score</div>
        <div style="font-size:48px;font-weight:700;color:{score_color};">{overall_score}</div>
        <div style="display:inline-block;background:{score_color}20;color:{score_color};padding:4px 12px;border-radius:4px;font-size:14px;font-weight:600;margin-top:8px;">Grade: {overall_grade}</div>
      </div>
      <div style="margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
          <span style="color:#9ca3af;">AI Visibility</span>
          <span style="color:#fff;font-weight:600;">{ai_score}/100</span>
        </div>
      </div>
      <p style="color:#9ca3af;font-size:15px;margin:0;">{score_message}</p>
    </div>
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:24px;text-align:center;">
      <h3 style="color:#fff;font-size:18px;margin:0 0 8px 0;">Want to Improve Your Score?</h3>
      <p style="color:#9ca3af;margin:0 0 16px 0;font-size:14px;">Book a free 15-minute consultation.</p>
      <a href="https://remodely.ai/#contact" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Book Free Consultation</a>
    </div>
    <div style="text-align:center;color:#6b7280;font-size:12px;margin-top:24px;">
      <p style="margin:0;">Remodely AI | <a href="https://remodely.ai" style="color:#3b82f6;">remodely.ai</a></p>
    </div>
  </div>
</body>
</html>"""

    text_content = f"""{greeting}

Your AI Visibility Report for {url}

OVERALL SCORE: {overall_score}/100 (Grade: {overall_grade})
AI Visibility: {ai_score}/100

{score_message}

Book a free consultation: https://remodely.ai/#contact

--
Remodely AI
https://remodely.ai"""

    if not SMTP_USER or not SMTP_PASS:
        return jsonify({'success': False, 'error': 'Email not configured'}), 500

    try:
        send_email(email, f'Your AI Visibility Report - Score: {overall_score}/100', html_content, text_content)
        return jsonify({'success': True, 'message': 'Report sent'})
    except Exception as e:
        print(f"Email error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# =============================================================================
# ARIA COMPANY ENDPOINTS (Multi-tenant)
# =============================================================================

def require_db():
    """Check if database is enabled, return error response if not"""
    if not DB_ENABLED:
        return jsonify({
            'success': False,
            'error': 'Database not configured. Set DATABASE_URL environment variable.'
        }), 503
    return None


@app.route('/api/aria/companies', methods=['GET'])
def list_companies():
    """List all Aria companies"""
    db_error = require_db()
    if db_error:
        return db_error
    companies = AriaCompany.query.order_by(AriaCompany.created_at.desc()).all()
    return jsonify({
        'success': True,
        'companies': [c.to_dict() for c in companies],
        'count': len(companies)
    })


@app.route('/api/aria/companies', methods=['POST'])
def create_company():
    """Create a new Aria company (tenant)"""
    db_error = require_db()
    if db_error:
        return db_error
    data = request.get_json()

    required = ['name', 'email']
    for field in required:
        if field not in data:
            return jsonify({'success': False, 'error': f'{field} is required'}), 400

    # Generate slug from name
    slug = data.get('slug') or data['name'].lower().replace(' ', '-').replace("'", '')
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')

    # Check if slug exists
    existing = AriaCompany.query.filter_by(slug=slug).first()
    if existing:
        slug = f"{slug}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    company = AriaCompany(
        name=data['name'],
        slug=slug,
        email=data['email'],
        phone=data.get('phone'),
        website=data.get('website'),
        business_type=data.get('business_type'),
        service_area=json.dumps(data.get('service_area', [])),
        business_hours=json.dumps(data.get('business_hours', {})),
        aria_greeting=data.get('aria_greeting'),
        aria_voice_id=data.get('aria_voice_id', 'nova'),
        aria_personality=data.get('aria_personality', 'friendly'),
        notify_email=data.get('notify_email', data['email']),
        notify_sms=data.get('notify_sms'),
        plan=data.get('plan', 'starter'),
        trial_ends_at=datetime.utcnow() + timedelta(days=14)
    )

    db.session.add(company)
    db.session.commit()

    return jsonify({
        'success': True,
        'company': company.to_dict(),
        'message': f'Company {company.name} created successfully'
    }), 201


@app.route('/api/aria/companies/<company_id>', methods=['GET'])
def get_company(company_id):
    """Get a specific company by ID or slug"""
    db_error = require_db()
    if db_error:
        return db_error
    company = AriaCompany.query.filter(
        (AriaCompany.id == company_id) | (AriaCompany.slug == company_id)
    ).first()

    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404

    return jsonify({
        'success': True,
        'company': company.to_dict()
    })


@app.route('/api/aria/companies/<company_id>', methods=['PUT'])
def update_company(company_id):
    """Update company settings"""
    db_error = require_db()
    if db_error:
        return db_error
    company = AriaCompany.query.filter(
        (AriaCompany.id == company_id) | (AriaCompany.slug == company_id)
    ).first()

    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404

    data = request.get_json()

    # Update fields
    if 'name' in data:
        company.name = data['name']
    if 'email' in data:
        company.email = data['email']
    if 'phone' in data:
        company.phone = data['phone']
    if 'website' in data:
        company.website = data['website']
    if 'business_type' in data:
        company.business_type = data['business_type']
    if 'service_area' in data:
        company.service_area = json.dumps(data['service_area'])
    if 'business_hours' in data:
        company.business_hours = json.dumps(data['business_hours'])
    if 'aria_greeting' in data:
        company.aria_greeting = data['aria_greeting']
    if 'aria_voice_id' in data:
        company.aria_voice_id = data['aria_voice_id']
    if 'aria_personality' in data:
        company.aria_personality = data['aria_personality']
    if 'aria_enabled' in data:
        company.aria_enabled = data['aria_enabled']
    if 'notify_email' in data:
        company.notify_email = data['notify_email']
    if 'notify_sms' in data:
        company.notify_sms = data['notify_sms']
    if 'notify_on_lead' in data:
        company.notify_on_lead = data['notify_on_lead']
    if 'notify_on_booking' in data:
        company.notify_on_booking = data['notify_on_booking']
    if 'vapi_assistant_id' in data:
        company.vapi_assistant_id = data['vapi_assistant_id']
    if 'vapi_phone_number' in data:
        company.vapi_phone_number = data['vapi_phone_number']
    if 'calendar_integration' in data:
        company.calendar_integration = data['calendar_integration']
    if 'calendar_id' in data:
        company.calendar_id = data['calendar_id']

    db.session.commit()

    return jsonify({
        'success': True,
        'company': company.to_dict(),
        'message': 'Company updated successfully'
    })


@app.route('/api/aria/companies/<company_id>', methods=['DELETE'])
def delete_company(company_id):
    """Delete a company and all its leads"""
    db_error = require_db()
    if db_error:
        return db_error
    company = AriaCompany.query.filter(
        (AriaCompany.id == company_id) | (AriaCompany.slug == company_id)
    ).first()

    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404

    company_name = company.name
    db.session.delete(company)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Company {company_name} deleted successfully'
    })


# =============================================================================
# ARIA LEAD ENDPOINTS
# =============================================================================

@app.route('/api/aria/companies/<company_id>/leads', methods=['GET'])
def list_leads(company_id):
    """List all leads for a company"""
    db_error = require_db()
    if db_error:
        return db_error
    company = AriaCompany.query.filter(
        (AriaCompany.id == company_id) | (AriaCompany.slug == company_id)
    ).first()

    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404

    # Filter options
    status = request.args.get('status')
    urgency = request.args.get('urgency')
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    query = AriaLead.query.filter_by(company_id=company.id)

    if status:
        query = query.filter_by(status=status)
    if urgency:
        query = query.filter_by(urgency=urgency)

    total = query.count()
    leads = query.order_by(AriaLead.created_at.desc()).offset(offset).limit(limit).all()

    return jsonify({
        'success': True,
        'leads': [l.to_dict() for l in leads],
        'total': total,
        'limit': limit,
        'offset': offset
    })


@app.route('/api/aria/companies/<company_id>/leads', methods=['POST'])
def create_lead(company_id):
    """Create a new lead (typically from VAPI webhook)"""
    db_error = require_db()
    if db_error:
        return db_error
    company = AriaCompany.query.filter(
        (AriaCompany.id == company_id) | (AriaCompany.slug == company_id)
    ).first()

    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404

    data = request.get_json()

    lead = AriaLead(
        company_id=company.id,
        caller_name=data.get('caller_name'),
        caller_phone=data.get('caller_phone'),
        caller_email=data.get('caller_email'),
        call_id=data.get('call_id'),
        call_duration=data.get('call_duration'),
        call_recording_url=data.get('call_recording_url'),
        call_transcript=data.get('call_transcript'),
        call_summary=data.get('call_summary'),
        lead_type=data.get('lead_type', 'new_customer'),
        service_requested=data.get('service_requested'),
        urgency=data.get('urgency', 'normal'),
        sentiment=data.get('sentiment'),
        appointment_scheduled=data.get('appointment_scheduled', False),
        appointment_datetime=datetime.fromisoformat(data['appointment_datetime']) if data.get('appointment_datetime') else None,
        appointment_notes=data.get('appointment_notes'),
        quote_requested=data.get('quote_requested', False),
        quote_details=json.dumps(data.get('quote_details', {})),
        quote_amount=data.get('quote_amount')
    )

    db.session.add(lead)
    db.session.commit()

    # Send notification if enabled
    if company.notify_on_lead and company.notify_email:
        try:
            send_lead_notification(company, lead)
        except Exception as e:
            print(f"Failed to send lead notification: {e}")

    return jsonify({
        'success': True,
        'lead': lead.to_dict(),
        'message': 'Lead created successfully'
    }), 201


@app.route('/api/aria/leads/<lead_id>', methods=['GET'])
def get_lead(lead_id):
    """Get a specific lead"""
    db_error = require_db()
    if db_error:
        return db_error
    lead = AriaLead.query.get(lead_id)

    if not lead:
        return jsonify({'success': False, 'error': 'Lead not found'}), 404

    return jsonify({
        'success': True,
        'lead': lead.to_dict()
    })


@app.route('/api/aria/leads/<lead_id>', methods=['PUT'])
def update_lead(lead_id):
    """Update lead status and notes"""
    db_error = require_db()
    if db_error:
        return db_error
    lead = AriaLead.query.get(lead_id)

    if not lead:
        return jsonify({'success': False, 'error': 'Lead not found'}), 404

    data = request.get_json()

    if 'status' in data:
        lead.status = data['status']
    if 'notes' in data:
        lead.notes = data['notes']
    if 'assigned_to' in data:
        lead.assigned_to = data['assigned_to']
    if 'follow_up_date' in data:
        lead.follow_up_date = datetime.fromisoformat(data['follow_up_date']) if data['follow_up_date'] else None
    if 'appointment_scheduled' in data:
        lead.appointment_scheduled = data['appointment_scheduled']
    if 'appointment_datetime' in data:
        lead.appointment_datetime = datetime.fromisoformat(data['appointment_datetime']) if data['appointment_datetime'] else None
    if 'appointment_notes' in data:
        lead.appointment_notes = data['appointment_notes']
    if 'quote_amount' in data:
        lead.quote_amount = data['quote_amount']

    db.session.commit()

    return jsonify({
        'success': True,
        'lead': lead.to_dict(),
        'message': 'Lead updated successfully'
    })


@app.route('/api/aria/leads/<lead_id>', methods=['DELETE'])
def delete_lead(lead_id):
    """Delete a lead"""
    db_error = require_db()
    if db_error:
        return db_error
    lead = AriaLead.query.get(lead_id)

    if not lead:
        return jsonify({'success': False, 'error': 'Lead not found'}), 404

    db.session.delete(lead)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Lead deleted successfully'
    })


# =============================================================================
# VAPI WEBHOOK ENDPOINT
# =============================================================================

@app.route('/api/aria/webhook/vapi', methods=['POST'])
def vapi_webhook():
    """Handle VAPI webhook events"""
    db_error = require_db()
    if db_error:
        return db_error
    data = request.get_json()

    event_type = data.get('type')
    call_data = data.get('call', {})

    # Extract company slug from assistant metadata or phone number
    company_slug = call_data.get('metadata', {}).get('company_slug')

    if not company_slug:
        # Try to find company by phone number
        phone_number = call_data.get('phoneNumber', {}).get('number')
        if phone_number:
            company = AriaCompany.query.filter_by(vapi_phone_number=phone_number).first()
            if company:
                company_slug = company.slug

    if not company_slug:
        return jsonify({'success': False, 'error': 'Company not identified'}), 400

    company = AriaCompany.query.filter_by(slug=company_slug).first()
    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404

    if event_type == 'call.ended':
        # Create lead from completed call
        lead = AriaLead(
            company_id=company.id,
            caller_name=call_data.get('customer', {}).get('name'),
            caller_phone=call_data.get('customer', {}).get('number'),
            call_id=call_data.get('id'),
            call_duration=call_data.get('duration'),
            call_recording_url=call_data.get('recordingUrl'),
            call_transcript=call_data.get('transcript'),
            call_summary=call_data.get('summary'),
            lead_type='new_customer',
            urgency='normal'
        )

        db.session.add(lead)
        db.session.commit()

        # Notify company
        if company.notify_on_lead and company.notify_email:
            try:
                send_lead_notification(company, lead)
            except Exception as e:
                print(f"Failed to send lead notification: {e}")

    return jsonify({'success': True, 'message': f'Webhook {event_type} processed'})


def send_lead_notification(company, lead):
    """Send email notification for new lead"""
    subject = f'New Lead: {lead.caller_name or "Unknown"} - {lead.service_requested or "General Inquiry"}'

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0f1a;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;margin:0;">ARIA AI</h1>
      <p style="color:#9ca3af;margin:8px 0 0 0;">New Lead for {company.name}</p>
    </div>
    <div style="background:#131c2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 24px 0;">📞 New Lead Captured</h2>
      <div style="margin-bottom:16px;padding:12px;background:rgba(59,130,246,0.1);border-radius:8px;">
        <div style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Caller</div>
        <div style="color:#fff;font-size:16px;font-weight:600;">{lead.caller_name or 'Unknown'}</div>
        <div style="color:#3b82f6;">{lead.caller_phone or 'No phone'}</div>
      </div>
      <div style="margin-bottom:16px;padding:12px;background:rgba(34,197,94,0.1);border-radius:8px;">
        <div style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Service Requested</div>
        <div style="color:#fff;">{lead.service_requested or 'General Inquiry'}</div>
      </div>
      <div style="margin-bottom:16px;padding:12px;background:rgba(234,179,8,0.1);border-radius:8px;">
        <div style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Urgency</div>
        <div style="color:#fff;">{lead.urgency.title()}</div>
      </div>
      {f'<div style="margin-bottom:16px;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;"><div style="color:#9ca3af;font-size:12px;text-transform:uppercase;">Summary</div><div style="color:#fff;">{lead.call_summary}</div></div>' if lead.call_summary else ''}
      <a href="https://remodely.ai/client-dashboard.html" style="display:block;text-align:center;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:24px;">View in Dashboard</a>
    </div>
  </div>
</body>
</html>"""

    text_content = f"""New Lead for {company.name}

Caller: {lead.caller_name or 'Unknown'}
Phone: {lead.caller_phone or 'No phone'}
Service: {lead.service_requested or 'General Inquiry'}
Urgency: {lead.urgency}

{f'Summary: {lead.call_summary}' if lead.call_summary else ''}

View in dashboard: https://remodely.ai/client-dashboard.html"""

    send_email(company.notify_email, subject, html_content, text_content)


# =============================================================================
# ARIA LEAD WEBHOOK (for aria-bridge integration)
# =============================================================================

@app.route('/api/aria-lead', methods=['POST'])
def aria_lead_webhook():
    """
    Receive leads from aria-bridge/voiceflow-crm
    This is the main webhook for capturing leads from ARIA voice calls
    """
    db_error = require_db()
    if db_error:
        return db_error

    data = request.get_json()
    print(f"📞 Received lead webhook: {json.dumps(data, indent=2)[:500]}")

    # Get or create company (default to Remodely)
    company_slug = data.get('companySlug', 'remodely')
    company = AriaCompany.query.filter_by(slug=company_slug).first()

    if not company:
        # Create Remodely as default company if not exists
        company = AriaCompany(
            name='Remodely AI',
            slug='remodely',
            email='help.remodely@gmail.com',
            phone='+16028334780',
            website='https://remodely.ai',
            business_type='AI Software',
            plan='enterprise'
        )
        db.session.add(company)
        db.session.commit()
        print(f"   Created default company: {company.name}")

    # Extract lead data from various formats
    lead_data = data.get('lead', data)

    # Create lead
    lead = AriaLead(
        company_id=company.id,
        caller_name=lead_data.get('name') or lead_data.get('callerName') or lead_data.get('contactName'),
        caller_phone=lead_data.get('phone') or lead_data.get('callerPhone') or lead_data.get('from'),
        caller_email=lead_data.get('email') or lead_data.get('callerEmail'),
        call_id=lead_data.get('callId') or lead_data.get('call_id'),
        call_duration=lead_data.get('duration') or lead_data.get('callDuration'),
        call_recording_url=lead_data.get('recordingUrl') or lead_data.get('recording'),
        call_transcript=lead_data.get('transcript') or lead_data.get('callTranscript'),
        call_summary=lead_data.get('summary') or lead_data.get('callSummary') or lead_data.get('notes'),
        lead_type=lead_data.get('type', 'new_customer'),
        service_requested=lead_data.get('service') or lead_data.get('serviceRequested') or lead_data.get('interest'),
        urgency=lead_data.get('urgency', 'normal'),
        sentiment=lead_data.get('sentiment'),
        status='new'
    )

    # Handle qualification data
    qualification = lead_data.get('qualification', {})
    if qualification:
        lead.notes = f"Business Type: {qualification.get('businessType', 'N/A')}\n"
        lead.notes += f"Company Size: {qualification.get('companySize', 'N/A')}\n"
        lead.notes += f"Lead Volume: {qualification.get('leadVolume', 'N/A')}\n"
        lead.notes += f"Pain Points: {qualification.get('painPoints', 'N/A')}\n"
        lead.notes += f"Current Tools: {qualification.get('currentTools', 'N/A')}\n"
        lead.notes += f"Timeline: {qualification.get('timeline', 'N/A')}\n"
        lead.notes += f"Decision Maker: {qualification.get('decisionMaker', 'N/A')}"

    # Handle appointment scheduling
    if lead_data.get('appointment') or lead_data.get('appointmentScheduled'):
        lead.appointment_scheduled = True
        apt_time = lead_data.get('appointmentTime') or lead_data.get('appointment', {}).get('datetime')
        if apt_time:
            try:
                lead.appointment_datetime = datetime.fromisoformat(apt_time.replace('Z', '+00:00'))
            except:
                pass
        lead.appointment_notes = lead_data.get('appointmentNotes') or lead_data.get('appointment', {}).get('notes')

    db.session.add(lead)
    db.session.commit()

    print(f"   ✅ Lead saved: {lead.caller_name or 'Unknown'} ({lead.caller_phone})")

    # Send notification email
    if company.notify_on_lead and company.notify_email:
        try:
            send_lead_notification(company, lead)
            print(f"   📧 Notification sent to {company.notify_email}")
        except Exception as e:
            print(f"   ⚠️ Failed to send notification: {e}")

    return jsonify({
        'success': True,
        'message': 'Lead captured successfully',
        'lead': lead.to_dict()
    }), 201


@app.route('/api/aria-lead', methods=['GET'])
def list_all_leads():
    """List all leads across all companies (for dashboard)"""
    db_error = require_db()
    if db_error:
        return db_error

    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    leads = AriaLead.query.order_by(AriaLead.created_at.desc()).offset(offset).limit(limit).all()

    return jsonify({
        'success': True,
        'leads': [l.to_dict() for l in leads],
        'count': len(leads)
    })


# =============================================================================
# STATS ENDPOINT
# =============================================================================

@app.route('/api/aria/companies/<company_id>/stats', methods=['GET'])
def company_stats(company_id):
    """Get statistics for a company"""
    db_error = require_db()
    if db_error:
        return db_error
    company = AriaCompany.query.filter(
        (AriaCompany.id == company_id) | (AriaCompany.slug == company_id)
    ).first()

    if not company:
        return jsonify({'success': False, 'error': 'Company not found'}), 404

    # Calculate stats
    total_leads = AriaLead.query.filter_by(company_id=company.id).count()
    new_leads = AriaLead.query.filter_by(company_id=company.id, status='new').count()
    converted_leads = AriaLead.query.filter_by(company_id=company.id, status='converted').count()
    appointments = AriaLead.query.filter_by(company_id=company.id, appointment_scheduled=True).count()

    # This week's leads
    week_ago = datetime.utcnow() - timedelta(days=7)
    this_week = AriaLead.query.filter(
        AriaLead.company_id == company.id,
        AriaLead.created_at >= week_ago
    ).count()

    # Conversion rate
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0

    return jsonify({
        'success': True,
        'stats': {
            'total_leads': total_leads,
            'new_leads': new_leads,
            'converted_leads': converted_leads,
            'appointments_scheduled': appointments,
            'leads_this_week': this_week,
            'conversion_rate': round(conversion_rate, 1)
        }
    })


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'Remodely AI Website Grader & Aria Multi-tenant System',
        'version': '3.0',
        'endpoints': {
            'grader': '/api/grade',
            'aria_companies': '/api/aria/companies',
            'aria_leads': '/api/aria/companies/<id>/leads',
            'vapi_webhook': '/api/aria/webhook/vapi'
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
