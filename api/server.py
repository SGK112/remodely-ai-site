"""
Remodely AI - Website Grader API Server
Flask API for the website grading tool
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from grader import grade_website
import os

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

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


@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'Remodely AI Website Grader',
        'version': '1.0',
        'endpoints': {
            '/api/grade': 'POST - Grade a website (body: {"url": "https://example.com"})',
            '/api/health': 'GET - Health check'
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
