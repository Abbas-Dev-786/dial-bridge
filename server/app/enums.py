from enum import Enum

class UserStatus(str, Enum):
    active = "active"
    invited = "invited"
    suspended = "suspended"
    deleted = "deleted"

class WorkspaceRole(str, Enum):
    owner = "owner"
    admin = "admin"
    editor = "editor"
    viewer = "viewer"

class PlanName(str, Enum):
    starter = "starter"
    pro = "pro"
    enterprise = "enterprise"
    custom = "custom"

class BillingInterval(str, Enum):
    monthly = "monthly"
    annual = "annual"

class SubscriptionStatus(str, Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    paused = "paused"

class AgentStatus(str, Enum):
    draft = "draft"
    live = "live"
    paused = "paused"
    archived = "archived"

class LLMProvider(str, Enum):
    openai = "openai"
    anthropic = "anthropic"
    google = "google"
    custom = "custom"

class InterruptionSensitivity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class ToolType(str, Enum):
    system = "system"
    client = "client"
    server = "server"

class HttpMethod(str, Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"

class PhoneNumberType(str, Enum):
    local = "local"
    toll_free = "toll_free"
    mobile = "mobile"
    sip = "sip"

class PhoneProvider(str, Enum):
    twilio = "twilio"
    vonage = "vonage"
    telnyx = "telnyx"
    sip_trunk = "sip_trunk"
    elevenlabs = "elevenlabs"

class PhoneNumberStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    released = "released"
    porting = "porting"

class CampaignStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    live = "live"
    paused = "paused"
    completed = "completed"
    archived = "archived"

class KBSyncStatus(str, Enum):
    pending = "pending"
    syncing = "syncing"
    synced = "synced"
    failed = "failed"

class DocType(str, Enum):
    pdf = "pdf"
    docx = "docx"
    txt = "txt"
    csv = "csv"
    url_scrape = "url_scrape"
    api_sync = "api_sync"

class DocStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"

class ContactStatus(str, Enum):
    pending = "pending"
    calling = "calling"
    called = "called"
    failed = "failed"
    opted_out = "opted_out"
    do_not_call = "do_not_call"

class CallDirection(str, Enum):
    inbound = "inbound"
    outbound = "outbound"

class CallStatus(str, Enum):
    queued = "queued"
    ringing = "ringing"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    no_answer = "no_answer"
    busy = "busy"
    voicemail = "voicemail"
    transferred = "transferred"
    timeout = "timeout"

class TranscriptSpeaker(str, Enum):
    agent = "agent"
    user = "user"
    tool = "tool"
    system = "system"

class Sentiment(str, Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"

class RetryOnOutcome(str, Enum):
    no_answer = "no_answer"
    busy = "busy"
    voicemail = "voicemail"
    failed = "failed"
    timeout = "timeout"

class IntegrationStatus(str, Enum):
    connected = "connected"
    inactive = "inactive"
    error = "error"
    disconnected = "disconnected"

class AuthMethod(str, Enum):
    oauth2 = "oauth2"
    api_key = "api_key"
    webhook_secret = "webhook_secret"
    basic = "basic"

class WebhookDeliveryStatus(str, Enum):
    pending = "pending"
    success = "success"
    failed = "failed"
    retrying = "retrying"

class KBSnapshotTrigger(str, Enum):
    paused = "paused"
    completed = "completed"
    agent_reassigned = "agent_reassigned"
