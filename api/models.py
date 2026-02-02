"""
Multi-tenant Aria System Models
Database models for AriaCompany and AriaLead
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()


def generate_uuid():
    return str(uuid.uuid4())


class AriaCompany(db.Model):
    """
    Multi-tenant company model for Aria AI Receptionist
    Each company gets their own Aria instance with custom configuration
    """
    __tablename__ = 'aria_companies'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Company Info
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)  # URL-friendly identifier
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    website = db.Column(db.String(255))

    # Business Details
    business_type = db.Column(db.String(100))  # e.g., "plumbing", "electrical", "hvac"
    service_area = db.Column(db.Text)  # JSON string of service areas
    business_hours = db.Column(db.Text)  # JSON string of business hours

    # Aria Configuration
    aria_greeting = db.Column(db.Text, default="Hi, this is Aria from {company_name}. How can I help you today?")
    aria_voice_id = db.Column(db.String(100), default="nova")  # Voice selection
    aria_personality = db.Column(db.String(50), default="friendly")  # friendly, professional, casual
    aria_enabled = db.Column(db.Boolean, default=True)

    # Integration Settings
    vapi_assistant_id = db.Column(db.String(100))  # VAPI assistant ID
    vapi_phone_number = db.Column(db.String(20))  # Assigned phone number
    calendar_integration = db.Column(db.String(50))  # google, calendly, etc.
    calendar_id = db.Column(db.String(255))

    # Notification Settings
    notify_email = db.Column(db.String(255))
    notify_sms = db.Column(db.String(20))
    notify_on_lead = db.Column(db.Boolean, default=True)
    notify_on_booking = db.Column(db.Boolean, default=True)

    # Subscription
    plan = db.Column(db.String(50), default="starter")  # starter, pro, enterprise
    stripe_customer_id = db.Column(db.String(100))
    subscription_status = db.Column(db.String(50), default="trial")  # trial, active, past_due, canceled
    trial_ends_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    leads = db.relationship('AriaLead', backref='company', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<AriaCompany {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'email': self.email,
            'phone': self.phone,
            'website': self.website,
            'business_type': self.business_type,
            'aria_enabled': self.aria_enabled,
            'plan': self.plan,
            'subscription_status': self.subscription_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'lead_count': self.leads.count()
        }


class AriaLead(db.Model):
    """
    Lead captured by Aria AI Receptionist
    Stores call details, transcripts, and lead information
    """
    __tablename__ = 'aria_leads'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    company_id = db.Column(db.String(36), db.ForeignKey('aria_companies.id'), nullable=False)

    # Caller Info
    caller_name = db.Column(db.String(255))
    caller_phone = db.Column(db.String(20))
    caller_email = db.Column(db.String(255))

    # Call Details
    call_id = db.Column(db.String(100))  # VAPI call ID
    call_duration = db.Column(db.Integer)  # Duration in seconds
    call_recording_url = db.Column(db.Text)
    call_transcript = db.Column(db.Text)
    call_summary = db.Column(db.Text)  # AI-generated summary

    # Lead Classification
    lead_type = db.Column(db.String(50))  # new_customer, existing_customer, spam
    service_requested = db.Column(db.String(255))  # What service they need
    urgency = db.Column(db.String(20), default="normal")  # low, normal, high, emergency
    sentiment = db.Column(db.String(20))  # positive, neutral, negative

    # Appointment
    appointment_scheduled = db.Column(db.Boolean, default=False)
    appointment_datetime = db.Column(db.DateTime)
    appointment_notes = db.Column(db.Text)

    # Quote
    quote_requested = db.Column(db.Boolean, default=False)
    quote_details = db.Column(db.Text)  # JSON string
    quote_amount = db.Column(db.Float)

    # Follow-up
    status = db.Column(db.String(50), default="new")  # new, contacted, qualified, converted, lost
    follow_up_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    assigned_to = db.Column(db.String(255))  # Staff member assigned

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<AriaLead {self.caller_name} - {self.company_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'caller_name': self.caller_name,
            'caller_phone': self.caller_phone,
            'caller_email': self.caller_email,
            'call_duration': self.call_duration,
            'call_summary': self.call_summary,
            'lead_type': self.lead_type,
            'service_requested': self.service_requested,
            'urgency': self.urgency,
            'sentiment': self.sentiment,
            'appointment_scheduled': self.appointment_scheduled,
            'appointment_datetime': self.appointment_datetime.isoformat() if self.appointment_datetime else None,
            'quote_requested': self.quote_requested,
            'quote_amount': self.quote_amount,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Client(db.Model):
    """
    Authenticated client for the dashboard
    Links Firebase Auth users to backend data
    """
    __tablename__ = 'clients'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False)  # Firebase Auth UID

    # Profile
    email = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255))
    company_name = db.Column(db.String(255))
    phone = db.Column(db.String(20))

    # Dashboard Stats
    active_projects = db.Column(db.Integer, default=0)
    website_traffic = db.Column(db.Integer, default=0)
    search_rankings = db.Column(db.Integer, default=0)
    leads_generated = db.Column(db.Integer, default=0)

    # Subscription
    plan = db.Column(db.String(50), default="free")  # free, starter, pro, enterprise
    subscription_status = db.Column(db.String(50), default="active")

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Relationships
    projects = db.relationship('ClientProject', backref='client', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Client {self.email}>'

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'company_name': self.company_name,
            'phone': self.phone,
            'active_projects': self.active_projects,
            'website_traffic': self.website_traffic,
            'search_rankings': self.search_rankings,
            'leads_generated': self.leads_generated,
            'plan': self.plan,
            'subscription_status': self.subscription_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'projects': [p.to_dict() for p in self.projects]
        }


class ClientProject(db.Model):
    """
    Projects for a client (website, SEO, AI agent, etc.)
    """
    __tablename__ = 'client_projects'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=False)

    # Project Info
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    project_type = db.Column(db.String(50))  # website, seo, voice_ai, automation, ai_agent
    status = db.Column(db.String(50), default="active")  # active, completed, on_hold, cancelled

    # Progress
    progress = db.Column(db.Integer, default=0)  # 0-100%

    # URLs/Resources
    website_url = db.Column(db.String(255))
    staging_url = db.Column(db.String(255))

    # Timestamps
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<ClientProject {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'project_type': self.project_type,
            'status': self.status,
            'progress': self.progress,
            'website_url': self.website_url,
            'staging_url': self.staging_url,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
