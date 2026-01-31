"""
Remodely AI - Website Grader API Server
Flask API for the website grading tool
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from grader import grade_website
import os
import requests

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# Email Configuration - using Resend HTTP API (works on all cloud platforms)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'reports@remodely.ai')


@app.route('/api/grade', methods=['POST', 'OPTIONS'])
def grade():
    """Grade a website"""
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
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'remodely-grader'})


@app.route('/api/debug-email', methods=['GET'])
def debug_email():
    """Debug email configuration"""
    return jsonify({
        'resend_api_key_set': bool(RESEND_API_KEY),
        'resend_api_key_length': len(RESEND_API_KEY) if RESEND_API_KEY else 0,
        'from_email': FROM_EMAIL,
        'method': 'Resend HTTP API'
    })


@app.route('/api/send-report', methods=['POST', 'OPTIONS'])
def send_report():
    """Send grader report via email using Resend API"""
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json()

    # Validate required fields
    required = ['email', 'name', 'url', 'scores']
    for field in required:
        if field not in data:
            return jsonify({'success': False, 'error': f'{field} is required'}), 400

    email = data['email']
    name = data['name']
    url = data['url']
    scores = data['scores']

    # Build email content
    overall_score = scores.get('overall', 0)
    ai_score = scores.get('ai_visibility', 0)
    overall_grade = scores.get('overall_grade', 'N/A')

    # Determine score color
    if overall_score >= 70:
        score_color = '#22c55e'
        score_message = "Good job! Your site has solid foundations."
    elif overall_score >= 50:
        score_color = '#eab308'
        score_message = "There's room for improvement. Let's fix that."
    else:
        score_color = '#ef4444'
        score_message = "Your business is invisible to AI. This needs urgent attention."

    # Greeting - handle generic names
    if name and name.lower() not in ['there', 'user', '']:
        greeting = f"Hi {name},"
    else:
        greeting = "Here's your report!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0f1a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #fff; font-size: 24px; margin: 0;">
            REMODELY<span style="color: #3b82f6;">.AI</span>
          </h1>
        </div>

        <!-- Main Card -->
        <div style="background: #131c2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #fff; font-size: 20px; margin: 0 0 8px 0;">
            {greeting}
          </h2>
          <p style="color: #9ca3af; margin: 0 0 24px 0;">
            Here's your AI Visibility Report for <strong style="color: #fff;">{url}</strong>
          </p>

          <!-- Score Box -->
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              Overall Score
            </div>
            <div style="font-size: 48px; font-weight: 700; color: {score_color}; line-height: 1;">
              {overall_score}
            </div>
            <div style="display: inline-block; background: {score_color}20; color: {score_color}; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 600; margin-top: 8px;">
              Grade: {overall_grade}
            </div>
          </div>

          <!-- Score Breakdown -->
          <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #9ca3af;">AI Visibility</span>
              <span style="color: #fff; font-weight: 600;">{ai_score}/100</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #9ca3af;">SEO Score</span>
              <span style="color: #fff; font-weight: 600;">{scores.get('seo', {}).get('meta_tags', 0)}/100</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0;">
              <span style="color: #9ca3af;">Technical</span>
              <span style="color: #fff; font-weight: 600;">{scores.get('technical', {}).get('speed', 0)}/100</span>
            </div>
          </div>

          <p style="color: #9ca3af; font-size: 15px; margin: 0;">
            {score_message}
          </p>
        </div>

        <!-- CTA -->
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h3 style="color: #fff; font-size: 18px; margin: 0 0 8px 0;">
            Want to Improve Your Score?
          </h3>
          <p style="color: #9ca3af; margin: 0 0 16px 0; font-size: 14px;">
            Book a free 15-minute consultation and we'll show you exactly how to fix it.
          </p>
          <a href="https://remodely.ai/#contact" style="display: inline-block; background: #ef4444; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Book Free Consultation
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">
            Remodely AI - Making Small Businesses Visible to AI
          </p>
          <p style="margin: 0;">
            <a href="https://remodely.ai" style="color: #3b82f6; text-decoration: none;">remodely.ai</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    # Plain text fallback
    text_content = f"""
{greeting}

Here's your AI Visibility Report for {url}

OVERALL SCORE: {overall_score}/100 (Grade: {overall_grade})
AI Visibility: {ai_score}/100
SEO Score: {scores.get('seo', {}).get('meta_tags', 0)}/100

{score_message}

Want to improve your score? Book a free consultation:
https://remodely.ai/#contact

--
Remodely AI
https://remodely.ai
    """

    # Send via Resend HTTP API
    if RESEND_API_KEY:
        try:
            response = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {RESEND_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'from': f'Remodely AI <{FROM_EMAIL}>',
                    'to': [email],
                    'subject': f'Your AI Visibility Report - Score: {overall_score}/100',
                    'html': html_content,
                    'text': text_content
                },
                timeout=10
            )

            if response.status_code == 200:
                print(f"Email sent successfully to {email}")
                return jsonify({'success': True, 'message': 'Report sent successfully'})
            else:
                error_msg = response.json().get('message', 'Unknown error')
                print(f"Resend API error: {response.status_code} - {error_msg}")
                return jsonify({'success': False, 'error': f'Email error: {error_msg}'}), 500

        except requests.exceptions.Timeout:
            print("Resend API timeout")
            return jsonify({'success': False, 'error': 'Email service timeout'}), 500
        except Exception as e:
            print(f"Email error: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    else:
        # No API key configured
        print("Resend API key not configured")
        return jsonify({'success': True, 'message': 'Report logged (email not configured)'})


@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'Remodely AI Website Grader',
        'version': '2.0',
        'endpoints': {
            '/api/grade': 'POST - Grade a website (body: {"url": "https://example.com"})',
            '/api/send-report': 'POST - Send report via email (body: {"email", "name", "url", "scores"})',
            '/api/health': 'GET - Health check',
            '/api/debug-email': 'GET - Debug email configuration'
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
