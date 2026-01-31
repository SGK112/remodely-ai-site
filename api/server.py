"""
Remodely AI - Website Grader API Server
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from grader import grade_website
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app)

# Email config
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASSWORD', '').replace(' ', '')  # Strip spaces from app password
FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', SMTP_USER)


def send_email(to_email, subject, html_content, text_content):
    """Send email via Gmail SMTP"""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'Remodely AI <{FROM_EMAIL}>'
    msg['To'] = to_email

    msg.attach(MIMEText(text_content, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))

    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASS)
    server.sendmail(FROM_EMAIL, to_email, msg.as_string())
    server.quit()


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
    return jsonify({
        'status': 'ok',
        'smtp_user': SMTP_USER,
        'smtp_pass_set': bool(SMTP_PASS),
        'smtp_pass_len': len(SMTP_PASS) if SMTP_PASS else 0
    })


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

    html_content = f"""
<!DOCTYPE html>
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
</html>
"""

    text_content = f"""{greeting}

Your AI Visibility Report for {url}

OVERALL SCORE: {overall_score}/100 (Grade: {overall_grade})
AI Visibility: {ai_score}/100

{score_message}

Book a free consultation: https://remodely.ai/#contact

--
Remodely AI
https://remodely.ai
"""

    if not SMTP_USER or not SMTP_PASS:
        return jsonify({'success': False, 'error': 'Email not configured'}), 500

    try:
        send_email(email, f'Your AI Visibility Report - Score: {overall_score}/100', html_content, text_content)
        return jsonify({'success': True, 'message': 'Report sent'})
    except Exception as e:
        print(f"Email error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'Remodely AI Website Grader',
        'version': '2.1'
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
