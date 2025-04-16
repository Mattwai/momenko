import os
from dotenv import load_dotenv
from twilio.rest import Client

account_sid = os.getenv("TWILIO_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
client = Client(account_sid, auth_token)
print(client)